/*
# Create emotion_detections table (single-tenant, no auth)

1. New Tables
- `emotion_detections`
  - `id` (uuid, primary key)
  - `source` (text, not null) — how the detection was performed: 'webcam' or 'upload'
  - `dominant_emotion` (text, not null) — the highest-confidence emotion label
  - `emotions` (jsonb, not null) — full emotion probability map: { neutral, happy, sad, angry, fearful, disgusted, surprised }
  - `confidence` (numeric, not null) — confidence score for the dominant emotion (0–1)
  - `face_count` (integer, not null, default 1) — number of faces detected in the frame
  - `thumbnail` (text, nullable) — optional base64 data URL thumbnail of the analyzed frame
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `emotion_detections`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in screen).
*/

CREATE TABLE IF NOT EXISTS emotion_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('webcam', 'upload')),
  dominant_emotion text NOT NULL,
  emotions jsonb NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  face_count integer NOT NULL DEFAULT 1,
  thumbnail text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emotion_detections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_emotion_detections" ON emotion_detections;
CREATE POLICY "anon_select_emotion_detections" ON emotion_detections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_emotion_detections" ON emotion_detections;
CREATE POLICY "anon_insert_emotion_detections" ON emotion_detections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_emotion_detections" ON emotion_detections;
CREATE POLICY "anon_update_emotion_detections" ON emotion_detections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_emotion_detections" ON emotion_detections;
CREATE POLICY "anon_delete_emotion_detections" ON emotion_detections FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_emotion_detections_created_at ON emotion_detections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_detections_dominant_emotion ON emotion_detections (dominant_emotion);
