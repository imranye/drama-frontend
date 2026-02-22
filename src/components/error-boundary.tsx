'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; swap for Sentry/Datadog in prod
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center bg-black">
          <p className="text-error text-lg font-semibold">Something went wrong</p>
          <p className="text-text-secondary text-sm">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button onClick={this.handleReset} className="btn-primary px-8">
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}