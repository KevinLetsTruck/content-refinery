-- Content Refinery Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SOURCES TABLE
-- Raw uploaded content (audio, video, text)
-- ============================================
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('audio', 'video', 'text', 'url')),
  file_url TEXT,
  original_filename TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSCRIPTS TABLE
-- ============================================
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  word_timestamps JSONB,
  speaker_segments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcripts_source_id ON transcripts(source_id);

-- ============================================
-- EXTRACTIONS TABLE
-- ============================================
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('quote', 'stat', 'hot_take', 'story', 'clip', 'product_mention')),
  text TEXT NOT NULL,
  start_time DECIMAL,
  end_time DECIMAL,
  confidence DECIMAL NOT NULL DEFAULT 0.5,
  product_ids TEXT[],
  is_used BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extractions_source_id ON extractions(source_id);
CREATE INDEX idx_extractions_type ON extractions(type);
CREATE INDEX idx_extractions_confidence ON extractions(confidence DESC);

-- ============================================
-- GENERATED_CONTENT TABLE
-- ============================================
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES extractions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube')),
  text TEXT NOT NULL,
  hashtags TEXT[],
  media_url TEXT,
  media_guidance TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  platform_post_url TEXT,
  engagement_data JSONB DEFAULT '{}',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_content_extraction_id ON generated_content(extraction_id);
CREATE INDEX idx_generated_content_platform ON generated_content(platform);
CREATE INDEX idx_generated_content_status ON generated_content(status);
CREATE INDEX idx_generated_content_scheduled_for ON generated_content(scheduled_for);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  compare_at_price DECIMAL,
  url TEXT NOT NULL,
  image_url TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active',
  inventory_quantity INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_shopify_id ON products(shopify_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_content_updated_at
  BEFORE UPDATE ON generated_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================
CREATE VIEW review_queue AS
SELECT 
  gc.id,
  gc.platform,
  gc.text,
  gc.hashtags,
  gc.status,
  gc.created_at,
  e.type AS extraction_type,
  e.text AS extraction_text,
  e.confidence,
  s.title AS source_title,
  s.source_type
FROM generated_content gc
JOIN extractions e ON gc.extraction_id = e.id
JOIN sources s ON e.source_id = s.id
WHERE gc.status = 'pending_review'
ORDER BY gc.created_at DESC;

-- ============================================
-- SEED Kevin's Daily Stack Products
-- ============================================
INSERT INTO products (shopify_id, title, description, price, url, vendor, product_type, tags) VALUES
  ('lyte-balance', 'Lyte Balance', 'Electrolytes (Magnesium, Potassium, Sodium)', 27.00, 'https://store.letstruck.com/products/lyte-balance-magnesium-potassium-sodium', 'Lyte Balance', 'Supplements', ARRAY['electrolytes', 'hydration', 'kevins-daily']),
  ('mind-fuel', 'Mind Fuel', 'C8 MCT Oil for mental and physical energy', 25.00, 'https://store.letstruck.com/products/mind-fuel', 'Healthy Tribe', 'Supplements', ARRAY['mct', 'energy', 'brain', 'kevins-daily']),
  ('cardio-miracle', 'Cardio Miracle', 'Nitric oxide support formula', 109.97, 'https://store.letstruck.com/products/cardio-miracle', 'Cardio Miracle', 'Supplements', ARRAY['nitric-oxide', 'heart', 'cardiovascular', 'kevins-daily']),
  ('bio-dk-mulsion', 'Bio-DK Mulsion', 'Vitamin D3 + K1/K2 micro-emulsion', 30.50, 'https://store.letstruck.com/products/bio-dk-mulsion', 'Biotics', 'Supplements', ARRAY['vitamin-d', 'vitamin-k', 'kevins-daily']),
  ('bee-ome-gold', 'Bee-Ome Gold', 'Functional honey with spore-based probiotics', 49.95, 'https://store.letstruck.com/products/bee-ome-gold', 'EnviroMedica', 'Supplements', ARRAY['probiotics', 'honey', 'gut-health', 'kevins-daily']),
  ('terraflora-deep-zen', 'Terraflora Deep Zen', 'Psychobiotic for gut-brain axis support', 59.95, 'https://store.letstruck.com/products/terraflora-synbiotic-deep-zen', 'EnviroMedica', 'Supplements', ARRAY['probiotics', 'mood', 'sleep', 'gut-brain', 'kevins-daily'])
ON CONFLICT (shopify_id) DO NOTHING;
