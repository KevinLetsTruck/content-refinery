/**
 * Transcription Service using Eleven Labs Scribe
 *
 * Eleven Labs Scribe provides state-of-the-art transcription with:
 * - 99 language support
 * - Word-level timestamps
 * - Speaker diarization
 * - Audio event tagging (laughter, footsteps, etc.)
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

export interface TranscriptionResult {
  text: string;
  words: {
    word: string;
    start: number;
    end: number;
    confidence: number;
  }[];
  speakers?: {
    speaker: number;
    start: number;
    end: number;
  }[];
  duration: number;
}

interface ScribeWord {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker_id?: string;
  logprob?: number;
}

interface ScribeResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: ScribeWord[];
  transcription_id: string;
}

function getApiKey(): string {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }
  return ELEVENLABS_API_KEY;
}

/**
 * Convert Scribe's logprob to a 0-1 confidence score
 * logprob ranges from -infinity to 0, where 0 is most confident
 */
function logprobToConfidence(logprob: number | undefined): number {
  if (logprob === undefined) return 0.9; // Default high confidence
  // Convert log probability to linear probability
  return Math.exp(logprob);
}

/**
 * Calculate audio duration from word timestamps
 */
function calculateDuration(words: ScribeWord[]): number {
  if (words.length === 0) return 0;
  const lastWord = words[words.length - 1];
  return lastWord.end;
}

/**
 * Extract speaker segments from word-level speaker IDs
 */
function extractSpeakerSegments(words: ScribeWord[]): { speaker: number; start: number; end: number }[] {
  if (words.length === 0) return [];

  const segments: { speaker: number; start: number; end: number }[] = [];
  let currentSpeaker: string | undefined = undefined;
  let segmentStart = 0;

  for (const word of words) {
    if (word.speaker_id !== currentSpeaker) {
      if (currentSpeaker !== undefined && segments.length > 0) {
        // End the previous segment
        segments[segments.length - 1].end = word.start;
      }

      // Start a new segment
      const speakerNum = word.speaker_id
        ? parseInt(word.speaker_id.replace('speaker_', ''), 10)
        : 0;

      segments.push({
        speaker: isNaN(speakerNum) ? 0 : speakerNum,
        start: word.start,
        end: word.end,
      });

      currentSpeaker = word.speaker_id;
      segmentStart = word.start;
    } else if (segments.length > 0) {
      // Extend current segment
      segments[segments.length - 1].end = word.end;
    }
  }

  return segments;
}

export async function transcribeAudio(
  audioUrl: string
): Promise<TranscriptionResult> {
  const apiKey = getApiKey();

  const formData = new FormData();
  formData.append("model_id", "scribe_v1");
  formData.append("cloud_storage_url", audioUrl);
  formData.append("diarize", "true");
  formData.append("timestamps_granularity", "word");
  formData.append("tag_audio_events", "true");

  const response = await fetch(ELEVENLABS_STT_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eleven Labs transcription failed: ${response.status} - ${errorText}`);
  }

  const result: ScribeResponse = await response.json();

  // Filter to only actual words (not audio events like "(laughter)")
  const wordEntries = result.words.filter(w => w.type === "word" || w.type === "punctuation");

  return {
    text: result.text,
    words: wordEntries.map((w) => ({
      word: w.text,
      start: w.start,
      end: w.end,
      confidence: logprobToConfidence(w.logprob),
    })),
    speakers: extractSpeakerSegments(result.words.filter(w => w.type === "word")),
    duration: calculateDuration(result.words),
  };
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimetype: string
): Promise<TranscriptionResult> {
  const apiKey = getApiKey();

  // Determine file extension from mimetype
  const extMap: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  const ext = extMap[mimetype] || "mp3";

  const formData = new FormData();
  formData.append("model_id", "scribe_v1");
  // Convert Buffer to ArrayBuffer for Blob compatibility
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  formData.append("file", new Blob([arrayBuffer], { type: mimetype }), `audio.${ext}`);
  formData.append("diarize", "true");
  formData.append("timestamps_granularity", "word");
  formData.append("tag_audio_events", "true");

  const response = await fetch(ELEVENLABS_STT_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eleven Labs transcription failed: ${response.status} - ${errorText}`);
  }

  const result: ScribeResponse = await response.json();

  // Filter to only actual words (not audio events like "(laughter)")
  const wordEntries = result.words.filter(w => w.type === "word" || w.type === "punctuation");

  return {
    text: result.text,
    words: wordEntries.map((w) => ({
      word: w.text,
      start: w.start,
      end: w.end,
      confidence: logprobToConfidence(w.logprob),
    })),
    speakers: extractSpeakerSegments(result.words.filter(w => w.type === "word")),
    duration: calculateDuration(result.words),
  };
}

// Get a segment of transcript by time range
export function getTranscriptSegment(
  result: TranscriptionResult,
  startTime: number,
  endTime: number
): string {
  const segmentWords = result.words.filter(
    (w) => w.start >= startTime && w.end <= endTime
  );
  return segmentWords.map((w) => w.word).join(" ");
}
