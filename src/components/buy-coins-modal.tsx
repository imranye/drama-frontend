'use client';

import { useCallback, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

import { apiClient } from '@/lib/api';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function memoInstruction(memo: string, payer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, 'utf8'),
  });
}

export function BuyCoinsModal(props: {
  open: boolean;
  onClose: () => void;
  onPurchased: (newBalance: number) => void;
}) {
  const { open, onClose, onPurchased } = props;
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBuy = connected && publicKey && !isLoading;

  const buy = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    setError(null);

    try {
      const intent = await apiClient.createSolanaTopUpIntent();

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(intent.treasury),
          lamports: intent.lamports,
        }),
        memoInstruction(intent.memo, publicKey)
      );

      const sig = await sendTransaction(tx, connection, { preflightCommitment: 'confirmed' });
      const confirmation = await connection.confirmTransaction(sig, 'confirmed');
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      const res = await apiClient.confirmSolanaTopUpIntent(intent.intentId, sig);
      if (!res.success) {
        throw new Error('Payment not confirmed');
      }
      onPurchased(res.balance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to purchase coins');
    } finally {
      setIsLoading(false);
    }
  }, [connection, onPurchased, publicKey, sendTransaction]);

  const priceLabel = useMemo(() => {
    // Backend currently uses a fixed pack (0.01 SOL → 10 coins) by default.
    return 'Buy 10 coins for 0.01 SOL';
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={() => !isLoading && onClose()} />
      <div className="relative w-[min(92vw,420px)] rounded-none border border-surface-light bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Get coins with SOL</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Connect your wallet, send SOL, and we’ll credit your account with coins.
            </p>
          </div>
          <button
            className="btn-secondary px-3 py-1"
            onClick={() => !isLoading && onClose()}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <WalletMultiButton className="btn-secondary w-full justify-center" />

          <button
            onClick={buy}
            disabled={!canBuy}
            className="btn-primary w-full disabled:opacity-60"
          >
            {isLoading ? 'Processing…' : priceLabel}
          </button>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="text-xs text-text-secondary">
            Network is determined by the environment (devnet in dev, mainnet in prod).
          </div>
        </div>
      </div>
    </div>
  );
}
