/**
 * Royalty-Free Music Library
 * 
 * Curated collection of music tracks for video production
 * All tracks are royalty-free and safe for YouTube monetization
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: "upbeat" | "inspiring" | "calm" | "dramatic" | "energetic";
  genre: string;
  duration: number; // seconds
  bpm: number;
  url: string; // Direct URL to audio file
  license: string;
  attribution?: string;
}

// Curated royalty-free music from Pixabay, Uppbeat, etc.
// These are placeholder URLs - in production, host on R2 or use API
export const MUSIC_LIBRARY: MusicTrack[] = [
  // Inspiring/Motivational
  {
    id: "inspiring_01",
    title: "Rise Up",
    artist: "Royalty Free Music",
    mood: "inspiring",
    genre: "Cinematic",
    duration: 180,
    bpm: 120,
    url: "/music/inspiring_01.mp3",
    license: "Royalty Free - Pixabay",
  },
  {
    id: "inspiring_02",
    title: "New Horizons",
    artist: "Royalty Free Music",
    mood: "inspiring",
    genre: "Corporate",
    duration: 150,
    bpm: 110,
    url: "/music/inspiring_02.mp3",
    license: "Royalty Free - Pixabay",
  },
  
  // Upbeat/Energetic
  {
    id: "upbeat_01",
    title: "Drive Forward",
    artist: "Royalty Free Music",
    mood: "upbeat",
    genre: "Electronic",
    duration: 120,
    bpm: 128,
    url: "/music/upbeat_01.mp3",
    license: "Royalty Free - Pixabay",
  },
  {
    id: "energetic_01",
    title: "Full Throttle",
    artist: "Royalty Free Music",
    mood: "energetic",
    genre: "Rock",
    duration: 140,
    bpm: 140,
    url: "/music/energetic_01.mp3",
    license: "Royalty Free - Pixabay",
  },
  
  // Calm/Ambient
  {
    id: "calm_01",
    title: "Open Road",
    artist: "Royalty Free Music",
    mood: "calm",
    genre: "Ambient",
    duration: 200,
    bpm: 80,
    url: "/music/calm_01.mp3",
    license: "Royalty Free - Pixabay",
  },
  {
    id: "calm_02",
    title: "Night Drive",
    artist: "Royalty Free Music",
    mood: "calm",
    genre: "Lo-Fi",
    duration: 180,
    bpm: 85,
    url: "/music/calm_02.mp3",
    license: "Royalty Free - Pixabay",
  },
  
  // Dramatic
  {
    id: "dramatic_01",
    title: "The Journey",
    artist: "Royalty Free Music",
    mood: "dramatic",
    genre: "Cinematic",
    duration: 210,
    bpm: 100,
    url: "/music/dramatic_01.mp3",
    license: "Royalty Free - Pixabay",
  },
];

/**
 * Get music tracks by mood
 */
export function getMusicByMood(mood: MusicTrack["mood"]): MusicTrack[] {
  return MUSIC_LIBRARY.filter(track => track.mood === mood);
}

/**
 * Get a random track matching the mood
 */
export function getRandomTrack(mood: MusicTrack["mood"]): MusicTrack | null {
  const tracks = getMusicByMood(mood);
  if (tracks.length === 0) return null;
  return tracks[Math.floor(Math.random() * tracks.length)];
}

/**
 * Get best track for video duration
 */
export function getBestTrackForDuration(
  mood: MusicTrack["mood"],
  targetDuration: number
): MusicTrack | null {
  const tracks = getMusicByMood(mood);
  if (tracks.length === 0) return null;
  
  // Find track closest to target duration (preferring longer tracks)
  return tracks.reduce((best, track) => {
    const bestDiff = Math.abs(best.duration - targetDuration);
    const trackDiff = Math.abs(track.duration - targetDuration);
    
    // Prefer tracks that are longer than target
    if (track.duration >= targetDuration && best.duration < targetDuration) {
      return track;
    }
    if (best.duration >= targetDuration && track.duration < targetDuration) {
      return best;
    }
    
    return trackDiff < bestDiff ? track : best;
  });
}

/**
 * Map video tone to music mood
 */
export function toneToMusicMood(
  tone: "educational" | "promotional" | "entertaining" | "inspirational"
): MusicTrack["mood"] {
  const mapping: Record<string, MusicTrack["mood"]> = {
    educational: "calm",
    promotional: "upbeat",
    entertaining: "energetic",
    inspirational: "inspiring",
  };
  return mapping[tone] || "inspiring";
}

/**
 * Pixabay Music API integration (free tier)
 */
export async function searchPixabayMusic(
  query: string,
  mood?: string
): Promise<MusicTrack[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.warn("Pixabay API key not configured, using local library");
    return MUSIC_LIBRARY;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    ...(mood && { mood }),
  });

  try {
    const response = await fetch(
      `https://pixabay.com/api/music/?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.hits.map((hit: any) => ({
      id: `pixabay_${hit.id}`,
      title: hit.title,
      artist: hit.user,
      mood: hit.mood || "inspiring",
      genre: hit.genre || "Unknown",
      duration: hit.duration,
      bpm: hit.bpm || 120,
      url: hit.audio,
      license: "Pixabay License",
      attribution: `Music by ${hit.user} from Pixabay`,
    }));
  } catch (error) {
    console.error("Pixabay API error:", error);
    return MUSIC_LIBRARY;
  }
}
