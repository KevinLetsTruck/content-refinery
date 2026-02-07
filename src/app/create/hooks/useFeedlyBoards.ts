import { useState, useCallback } from "react";

export interface FeedlyBoard {
  id: string;
  label: string;
  description?: string;
}

export interface FeedlyArticle {
  id: string;
  title: string;
  published: number;
  publishedFormatted: string;
  url?: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  summary?: string;
  contentPreview: string;
  fullContent: string;
  topics: string[];
  keywords: string[];
  engagement?: number;
}

export function useFeedlyBoards() {
  const [boards, setBoards] = useState<FeedlyBoard[]>([]);
  const [articles, setArticles] = useState<FeedlyArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<FeedlyBoard | null>(null);

  // Fetch the list of Feedly boards
  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedly/boards");
      const data = await res.json();

      setConfigured(data.configured);
      if (data.configured && data.boards) {
        setBoards(data.boards);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to fetch Feedly boards:", err);
      setError("Failed to connect to Feedly");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch articles from a specific board
  const loadArticles = useCallback(async (boardId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedly/articles?boardId=${encodeURIComponent(boardId)}&count=30`);
      const data = await res.json();

      if (data.articles) {
        setArticles(data.articles);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to fetch Feedly articles:", err);
      setError("Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, []);

  // Select a board and load its articles
  const selectBoard = useCallback(
    (board: FeedlyBoard) => {
      setSelectedBoard(board);
      setArticles([]);
      loadArticles(board.id);
    },
    [loadArticles]
  );

  // Go back to board selection
  const clearSelectedBoard = useCallback(() => {
    setSelectedBoard(null);
    setArticles([]);
  }, []);

  return {
    boards,
    articles,
    loading,
    configured,
    error,
    selectedBoard,
    loadBoards,
    loadArticles,
    selectBoard,
    clearSelectedBoard,
  };
}
