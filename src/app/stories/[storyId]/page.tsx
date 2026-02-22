import { StoryClient } from './story-client';

export async function generateStaticParams(): Promise<Array<{ storyId: string }>> {
  try {
    const res = await fetch(
      'https://drama-backend.imuthuvappa.workers.dev/content?type=trending&limit=50&offset=0',
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const stories = Array.isArray(json?.stories) ? json.stories : [];
    return stories
      .map((s: any) => ({ storyId: String(s?.storyId || '') }))
      .filter((p: any) => Boolean(p.storyId));
  } catch {
    return [];
  }
}

export default async function StoryPage({ params }: { params: { storyId: string } }) {
  return <StoryClient storyId={params.storyId} />;
}
