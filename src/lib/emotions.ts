export type EmotionKey =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised';

export type EmotionMap = Record<EmotionKey, number>;

export interface EmotionInfo {
  key: EmotionKey;
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  bg: string;
  ring: string;
}

export const EMOTIONS: Record<EmotionKey, EmotionInfo> = {
  neutral: {
    key: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: '#64748b',
    gradient: 'from-slate-400 to-slate-500',
    bg: 'bg-slate-500',
    ring: 'ring-slate-400',
  },
  happy: {
    key: 'happy',
    label: 'Happy',
    emoji: '😄',
    color: '#22c55e',
    gradient: 'from-green-400 to-emerald-500',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-400',
  },
  sad: {
    key: 'sad',
    label: 'Sad',
    emoji: '😢',
    color: '#3b82f6',
    gradient: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-500',
    ring: 'ring-blue-400',
  },
  angry: {
    key: 'angry',
    label: 'Angry',
    emoji: '😠',
    color: '#ef4444',
    gradient: 'from-red-400 to-red-600',
    bg: 'bg-red-500',
    ring: 'ring-red-400',
  },
  fearful: {
    key: 'fearful',
    label: 'Fearful',
    emoji: '😨',
    color: '#a855f7',
    gradient: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-500',
    ring: 'ring-purple-400',
  },
  disgusted: {
    key: 'disgusted',
    label: 'Disgusted',
    emoji: '🤢',
    color: '#84cc16',
    gradient: 'from-lime-400 to-lime-600',
    bg: 'bg-lime-500',
    ring: 'ring-lime-400',
  },
  surprised: {
    key: 'surprised',
    label: 'Surprised',
    emoji: '😮',
    color: '#f59e0b',
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-500',
    ring: 'ring-amber-400',
  },
};

export const EMOTION_LIST = Object.values(EMOTIONS);

export function getDominantEmotion(emotions: EmotionMap): EmotionKey {
  let max = -1;
  let dominant: EmotionKey = 'neutral';
  for (const key of Object.keys(emotions) as EmotionKey[]) {
    if (emotions[key] > max) {
      max = emotions[key];
      dominant = key;
    }
  }
  return dominant;
}

export function formatEmotionKey(key: string): EmotionKey {
  const known: EmotionKey[] = [
    'neutral',
    'happy',
    'sad',
    'angry',
    'fearful',
    'disgusted',
    'surprised',
  ];
  return known.includes(key as EmotionKey) ? (key as EmotionKey) : 'neutral';
}
