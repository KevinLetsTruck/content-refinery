/**
 * Content Refinery Client for AudioRoad
 * 
 * Drop this file into your AudioRoad app to enable
 * "Send to Content Refinery" functionality.
 * 
 * Usage:
 * 
 * import { sendToContentRefinery } from './content-refinery-client';
 * 
 * // When user clicks "Send to Content Refinery"
 * const result = await sendToContentRefinery({
 *   title: episode.title,
 *   audioUrl: episode.audioFileUrl,
 *   showName: 'Trucking Business & Beyond',
 *   episodeNumber: episode.number,
 *   recordedAt: episode.recordedAt,
 * });
 * 
 * Required environment variable:
 * CONTENT_REFINERY_API_KEY=cr_xxxxx (get this from Content Refinery)
 */

// Configuration
const CONTENT_REFINERY_URL = process.env.CONTENT_REFINERY_URL || 'https://content-refinery.onrender.com';
const API_KEY = process.env.CONTENT_REFINERY_API_KEY;

interface EpisodePayload {
  title: string;
  audioUrl: string;
  showName?: string;
  episodeNumber?: number;
  recordedAt?: string | Date;
  description?: string;
  transcript?: string; // If you already have a transcript
  callerSegments?: {
    callerName?: string;
    startTime: number;
    endTime: number;
    topic?: string;
  }[];
}

interface SuccessStoryPayload {
  clientName: string; // First name only
  title: string;
  story: string;
  beforeStats?: {
    weight?: number;
    sleepHours?: number;
    labMarkers?: Record<string, number>;
  };
  afterStats?: {
    weight?: number;
    sleepHours?: number;
    labMarkers?: Record<string, number>;
  };
  productsUsed?: string[];
  duration?: string; // e.g., "3 months"
}

interface IngestResponse {
  success: boolean;
  sourceId: string;
  message: string;
  status: string;
}

interface StatusResponse {
  sourceId: string;
  status: string;
  errorMessage?: string;
  transcripts: number;
  extractions: number;
  generatedContent: number;
}

/**
 * Send an episode to Content Refinery for processing
 */
export async function sendEpisodeToContentRefinery(
  payload: EpisodePayload
): Promise<IngestResponse> {
  if (!API_KEY) {
    throw new Error('CONTENT_REFINERY_API_KEY environment variable is not set');
  }

  const response = await fetch(`${CONTENT_REFINERY_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'audioroad',
      contentType: 'episode',
      title: payload.title,
      audioUrl: payload.audioUrl,
      transcript: payload.transcript,
      metadata: {
        showName: payload.showName,
        episodeNumber: payload.episodeNumber,
        recordedAt: payload.recordedAt,
        description: payload.description,
        callerSegments: payload.callerSegments,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Content Refinery error: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Send a caller segment (if processing separately)
 */
export async function sendCallerSegmentToContentRefinery(
  payload: {
    title: string;
    audioUrl: string;
    callerName?: string;
    topic?: string;
    showName?: string;
    episodeTitle?: string;
  }
): Promise<IngestResponse> {
  if (!API_KEY) {
    throw new Error('CONTENT_REFINERY_API_KEY environment variable is not set');
  }

  const response = await fetch(`${CONTENT_REFINERY_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'audioroad',
      contentType: 'caller_segment',
      title: payload.title,
      audioUrl: payload.audioUrl,
      metadata: {
        callerName: payload.callerName,
        topic: payload.topic,
        showName: payload.showName,
        episodeTitle: payload.episodeTitle,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Content Refinery error: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Send a success story from Health Coaching App
 */
export async function sendSuccessStoryToContentRefinery(
  payload: SuccessStoryPayload
): Promise<IngestResponse> {
  if (!API_KEY) {
    throw new Error('CONTENT_REFINERY_API_KEY environment variable is not set');
  }

  const response = await fetch(`${CONTENT_REFINERY_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'health-coaching',
      contentType: 'success_story',
      title: payload.title,
      text: payload.story,
      metadata: {
        clientName: payload.clientName,
        beforeStats: payload.beforeStats,
        afterStats: payload.afterStats,
        productsUsed: payload.productsUsed,
        duration: payload.duration,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Content Refinery error: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Check processing status
 */
export async function checkProcessingStatus(
  sourceId: string
): Promise<StatusResponse> {
  if (!API_KEY) {
    throw new Error('CONTENT_REFINERY_API_KEY environment variable is not set');
  }

  const response = await fetch(`${CONTENT_REFINERY_URL}/api/process?sourceId=${sourceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Content Refinery error: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Trigger processing for a source (if auto-processing is disabled)
 */
export async function triggerProcessing(
  sourceId: string,
  steps?: ('transcribe' | 'extract' | 'generate')[]
): Promise<{ success: boolean; results: unknown }> {
  if (!API_KEY) {
    throw new Error('CONTENT_REFINERY_API_KEY environment variable is not set');
  }

  const response = await fetch(`${CONTENT_REFINERY_URL}/api/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceId,
      steps: steps || ['transcribe', 'extract', 'generate'],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Content Refinery error: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Send to Content Refinery - convenience wrapper
 * Automatically detects content type from payload
 */
export async function sendToContentRefinery(
  payload: EpisodePayload | SuccessStoryPayload & { type?: 'episode' | 'success_story' }
): Promise<IngestResponse> {
  if ('audioUrl' in payload) {
    return sendEpisodeToContentRefinery(payload as EpisodePayload);
  } else if ('story' in payload) {
    return sendSuccessStoryToContentRefinery(payload as SuccessStoryPayload);
  } else {
    throw new Error('Invalid payload: must include audioUrl (for episodes) or story (for success stories)');
  }
}

// ============================================
// React Hook (for Next.js/React apps)
// ============================================

/**
 * React hook for Content Refinery integration
 * 
 * Usage:
 * const { sendEpisode, status, isLoading, error } = useContentRefinery();
 * 
 * const handleSend = async () => {
 *   const result = await sendEpisode({
 *     title: 'TBB Episode 2847',
 *     audioUrl: 'https://...',
 *     showName: 'Trucking Business & Beyond',
 *   });
 *   console.log('Sent!', result.sourceId);
 * };
 */
export function useContentRefinery() {
  // This is a placeholder for React integration
  // Actual implementation would use useState/useCallback
  return {
    sendEpisode: sendEpisodeToContentRefinery,
    sendCallerSegment: sendCallerSegmentToContentRefinery,
    sendSuccessStory: sendSuccessStoryToContentRefinery,
    checkStatus: checkProcessingStatus,
    triggerProcessing,
  };
}

// ============================================
// Example Button Component (React)
// ============================================

/*
import { useState } from 'react';
import { sendEpisodeToContentRefinery } from './content-refinery-client';

export function SendToContentRefineryButton({ episode }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await sendEpisodeToContentRefinery({
        title: episode.title,
        audioUrl: episode.audioUrl,
        showName: episode.showName,
        episodeNumber: episode.number,
      });
      setResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="text-green-600">
        ✓ Sent to Content Refinery
        <a href={`https://content-refinery.onrender.com/queue?source=${result.sourceId}`}>
          View in queue
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
    >
      {loading ? 'Sending...' : '📤 Send to Content Refinery'}
    </button>
  );
}
*/
