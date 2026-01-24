import { NextRequest, NextResponse } from 'next/server';
import { feedlyClient } from '@/lib/feedly/client';

/**
 * GET /api/feedly/articles
 *
 * Fetches articles from a Feedly board or stream.
 *
 * Query params:
 * - boardId: The board/stream ID to fetch from (required)
 * - count: Number of articles to fetch (default: 20, max: 100)
 * - continuation: Pagination token for next page
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Feedly is configured
    if (!process.env.FEEDLY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Feedly not configured' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const count = parseInt(searchParams.get('count') || '20', 10);
    const continuation = searchParams.get('continuation') || undefined;

    if (!boardId) {
      return NextResponse.json(
        { error: 'boardId is required' },
        { status: 400 }
      );
    }

    const response = await feedlyClient.getStreamContents(boardId, {
      count: Math.min(count, 100),
      continuation,
    });

    // Transform articles to a cleaner format for the frontend
    const articles = response.items.map((article) => ({
      id: article.id,
      title: article.title,
      published: article.published,
      publishedFormatted: new Date(article.published).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      url: feedlyClient.getArticleUrl(article),
      source: article.origin?.title || 'Unknown source',
      sourceUrl: article.origin?.htmlUrl,
      author: article.author,
      summary: article.summary?.content
        ? feedlyClient.getArticleContent({ ...article, fullContent: undefined, content: undefined })
        : undefined,
      contentPreview: feedlyClient.getArticleContent(article).slice(0, 300) + '...',
      fullContent: feedlyClient.getArticleContent(article),
      topics: article.commonTopics?.slice(0, 5).map((t) => t.label) || [],
      keywords: article.keywords?.slice(0, 10) || [],
      engagement: article.engagement,
    }));

    return NextResponse.json({
      articles,
      continuation: response.continuation,
      hasMore: !!response.continuation,
    });
  } catch (error) {
    console.error('Feedly articles error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
