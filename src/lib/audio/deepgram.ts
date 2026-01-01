import { createClient, DeepgramClient } from "@deepgram/sdk";

let deepgramClient: DeepgramClient | null = null;

function getDeepgramClient(): DeepgramClient {
  if (!deepgramClient) {
    deepgramClient = createClient(process.env.DEEPGRAM_API_KEY!);
  }
  return deepgramClient;
}

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

export async function transcribeAudio(
  audioUrl: string
): Promise<TranscriptionResult> {
  const deepgram = getDeepgramClient();

  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: "nova-2",
      smart_format: true,
      punctuate: true,
      paragraphs: true,
      utterances: true,
      diarize: true, // Speaker detection
    }
  );

  if (error) {
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];

  return {
    text: alternative.transcript,
    words: alternative.words.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
    speakers: result.results.utterances?.map((u) => ({
      speaker: u.speaker,
      start: u.start,
      end: u.end,
    })),
    duration: result.metadata.duration,
  };
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimetype: string
): Promise<TranscriptionResult> {
  const deepgram = getDeepgramClient();

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    buffer,
    {
      model: "nova-2",
      smart_format: true,
      punctuate: true,
      paragraphs: true,
      utterances: true,
      diarize: true,
      mimetype,
    }
  );

  if (error) {
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];

  return {
    text: alternative.transcript,
    words: alternative.words.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
    speakers: result.results.utterances?.map((u) => ({
      speaker: u.speaker,
      start: u.start,
      end: u.end,
    })),
    duration: result.metadata.duration,
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
