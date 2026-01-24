/**
 * Feedly API Client
 *
 * Integrates with Feedly to fetch saved articles from boards for content creation.
 * Uses Bearer token authentication via FEEDLY_ACCESS_TOKEN environment variable.
 */

const FEEDLY_API_BASE = 'https://api.feedly.com/v3';

export interface FeedlyBoard {
  id: string;
  label: string;
  description?: string;
  created?: number;
  enterprise?: string;
}

export interface FeedlyCategory {
  id: string;
  label: string;
  description?: string;
}

export interface FeedlyArticle {
  id: string;
  title: string;
  published: number;
  crawled: number;
  summary?: {
    content: string;
    direction?: string;
  };
  content?: {
    content: string;
    direction?: string;
  };
  fullContent?: string;
  canonicalUrl?: string;
  alternate?: Array<{
    href: string;
    type: string;
  }>;
  origin?: {
    streamId: string;
    title: string;
    htmlUrl: string;
  };
  author?: string;
  categories?: FeedlyCategory[];
  commonTopics?: Array<{
    label: string;
    score: number;
  }>;
  entities?: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  keywords?: string[];
  unread?: boolean;
  engagement?: number;
  engagementRate?: number;
}

export interface FeedlyStreamResponse {
  id: string;
  updated?: number;
  continuation?: string;
  items: FeedlyArticle[];
}

export interface FeedlyTagsResponse {
  id: string;
  label?: string;
  description?: string;
}

class FeedlyClient {
  private accessToken: string | null = null;

  private getAccessToken(): string {
    if (this.accessToken) {
      return this.accessToken;
    }

    const token = process.env.FEEDLY_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FEEDLY_ACCESS_TOKEN environment variable is not set');
    }

    this.accessToken = token;
    return token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();

    const response = await fetch(`${FEEDLY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Feedly API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all boards (tags) for the authenticated user/team
   */
  async getBoards(): Promise<FeedlyBoard[]> {
    const tags = await this.request<FeedlyTagsResponse[]>('/tags');

    // Filter to only include boards (tags), not system tags
    return tags
      .filter(tag => tag.id && !tag.id.includes('global.'))
      .map(tag => ({
        id: tag.id,
        label: tag.label || 'Untitled Board',
        description: tag.description,
      }));
  }

  /**
   * Get all categories (folders) for the authenticated user/team
   */
  async getCategories(): Promise<FeedlyCategory[]> {
    const categories = await this.request<FeedlyCategory[]>('/categories');

    return categories.map(cat => ({
      id: cat.id,
      label: cat.label || 'Untitled Folder',
      description: cat.description,
    }));
  }

  /**
   * Get articles from a stream (board, category, or feed)
   */
  async getStreamContents(
    streamId: string,
    options: {
      count?: number;
      newerThan?: number;
      olderThan?: number;
      continuation?: string;
      unreadOnly?: boolean;
    } = {}
  ): Promise<FeedlyStreamResponse> {
    const params = new URLSearchParams();
    params.append('streamId', streamId);

    if (options.count) params.append('count', options.count.toString());
    if (options.newerThan) params.append('newerThan', options.newerThan.toString());
    if (options.olderThan) params.append('olderThan', options.olderThan.toString());
    if (options.continuation) params.append('continuation', options.continuation);
    if (options.unreadOnly) params.append('unreadOnly', 'true');

    return this.request<FeedlyStreamResponse>(`/streams/contents?${params.toString()}`);
  }

  /**
   * Get a single article by ID
   */
  async getArticle(entryId: string): Promise<FeedlyArticle> {
    return this.request<FeedlyArticle>(`/entries/${encodeURIComponent(entryId)}`);
  }

  /**
   * Get multiple articles by IDs (batch)
   */
  async getArticles(entryIds: string[]): Promise<FeedlyArticle[]> {
    return this.request<FeedlyArticle[]>('/entries/.mget', {
      method: 'POST',
      body: JSON.stringify(entryIds),
    });
  }

  /**
   * Search articles across team feeds
   */
  async searchArticles(
    query: string,
    options: {
      streamId?: string;
      count?: number;
      newerThan?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<FeedlyStreamResponse> {
    const params = new URLSearchParams();
    params.append('query', query);

    if (options.streamId) params.append('streamId', options.streamId);
    if (options.count) params.append('count', options.count.toString());
    if (options.newerThan) params.append('newerThan', options.newerThan.toString());
    if (options.unreadOnly) params.append('unreadOnly', 'true');

    return this.request<FeedlyStreamResponse>(`/search/contents?${params.toString()}`);
  }

  /**
   * Get the user's profile
   */
  async getProfile(): Promise<{ id: string; email?: string; fullName?: string }> {
    return this.request('/profile');
  }

  /**
   * Extract the best content from an article (prefers full content, falls back to summary)
   */
  getArticleContent(article: FeedlyArticle): string {
    // Try fullContent first (if available)
    if (article.fullContent) {
      return this.stripHtml(article.fullContent);
    }

    // Then content.content
    if (article.content?.content) {
      return this.stripHtml(article.content.content);
    }

    // Fall back to summary
    if (article.summary?.content) {
      return this.stripHtml(article.summary.content);
    }

    return '';
  }

  /**
   * Get the article URL
   */
  getArticleUrl(article: FeedlyArticle): string | undefined {
    if (article.canonicalUrl) {
      return article.canonicalUrl;
    }

    if (article.alternate && article.alternate.length > 0) {
      return article.alternate[0].href;
    }

    return undefined;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

// Export singleton instance
export const feedlyClient = new FeedlyClient();

// Also export the class for testing
export { FeedlyClient };
