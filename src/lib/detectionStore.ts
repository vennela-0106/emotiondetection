import { supabase } from './supabase';

export interface DetectionRecord {
  id: string;
  source: 'webcam' | 'upload';
  dominant_emotion: string;
  emotions: Record<string, number>;
  confidence: number;
  face_count: number;
  thumbnail: string | null;
  created_at: string;
}

export async function saveDetection(
  record: Omit<DetectionRecord, 'id' | 'created_at'>,
): Promise<DetectionRecord | null> {
  const { data, error } = await supabase
    .from('emotion_detections')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to save detection:', error.message);
    return null;
  }

  return data as DetectionRecord;
}

export async function fetchDetections(limit = 100): Promise<DetectionRecord[]> {
  const { data, error } = await supabase
    .from('emotion_detections')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch detections:', error.message);
    return [];
  }

  return (data || []) as DetectionRecord[];
}

export async function deleteDetection(id: string): Promise<boolean> {
  const { error } = await supabase.from('emotion_detections').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete detection:', error.message);
    return false;
  }
  return true;
}

export async function deleteAllDetections(): Promise<boolean> {
  const { error } = await supabase.from('emotion_detections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Failed to clear detections:', error.message);
    return false;
  }
  return true;
}
