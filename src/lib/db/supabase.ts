import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Client-side Supabase client
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client with service role
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Database types (will be generated from Supabase)
// For now, using placeholder types
export type Source = {
  id: string;
  title: string;
  source_type: "audio" | "video" | "text" | "url";
  file_url?: string;
  duration_seconds?: number;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
};

export type Transcript = {
  id: string;
  source_id: string;
  full_text: string;
  word_timestamps?: { word: string; start: number; end: number }[];
  created_at: string;
};

export type Extraction = {
  id: string;
  source_id: string;
  transcript_id: string;
  type: "quote" | "stat" | "hot_take" | "story" | "clip" | "product_mention";
  text: string;
  start_time?: number;
  end_time?: number;
  confidence: number;
  product_ids?: string[];
  created_at: string;
};

export type GeneratedContent = {
  id: string;
  extraction_id: string;
  platform: "twitter" | "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube";
  text: string;
  hashtags?: string[];
  media_url?: string;
  status: "draft" | "pending_review" | "approved" | "scheduled" | "published" | "failed";
  scheduled_for?: string;
  published_at?: string;
  platform_post_id?: string;
  engagement_data?: {
    likes?: number;
    shares?: number;
    comments?: number;
    impressions?: number;
    clicks?: number;
  };
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  shopify_id: string;
  title: string;
  description?: string;
  price: number;
  url: string;
  image_url?: string;
  tags?: string[];
  synced_at: string;
};
