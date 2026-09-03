import { useRef, useState, useCallback } from 'react';
import { loadFaceModels, detectFacesInImage, type DetectionResult } from '@/lib/faceApi';
import { EMOTIONS, getDominantEmotion, type EmotionKey } from '@/lib/emotions';
import { saveDetection } from '@/lib/detectionStore';

interface UploadDetectorProps {
  onDetectionSaved: () => void;
}

export default function UploadDetector({ onDetectionSaved }: UploadDetectorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelError, setModelError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const ensureModels = useCallback(async () => {
    if (modelState === 'ready') return true;
    setModelState('loading');
    try {
      await loadFaceModels();
      setModelState('ready');
      return true;
    } catch (err) {
      setModelState('error');
      setModelError(err instanceof Error ? err.message : 'Failed to load models');
      return false;
    }
  }, [modelState]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const ready = await ensureModels();
      if (!ready) return;

      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setDetections([]);
      setSaved(false);
    },
    [ensureModels],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const analyze = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;
    setAnalyzing(true);
    try {
      const results = await detectFacesInImage(img);
      setDetections(results);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          for (const d of results) {
            const dominantKey = getDominantEmotion(d.emotions as Record<EmotionKey, number>);
            const info = EMOTIONS[dominantKey];
            ctx.strokeStyle = info.color;
            ctx.lineWidth = Math.max(3, canvas.width / 200);
            ctx.beginPath();
              ctx.roundRect(d.box.x, d.box.y, d.box.width, d.box.height, 10);
            ctx.stroke();

            const label = `${info.emoji} ${info.label} ${Math.round(d.confidence * 100)}%`;
            const fontSize = Math.max(14, canvas.width / 30);
            ctx.font = `bold ${fontSize}px sans-serif`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.roundRect(d.box.x, d.box.y - fontSize * 1.5, textWidth + fontSize, fontSize * 1.3, 6);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(label, d.box.x + fontSize * 0.5, d.box.y - fontSize * 0.4);
          }
        }
      }

      if (results.length > 0) {
        const top = results[0];
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 160;
        thumbCanvas.height = 120;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          const scale = Math.min(160 / img.naturalWidth, 120 / img.naturalHeight);
          const sw = img.naturalWidth * scale;
          const sh = img.naturalHeight * scale;
          thumbCtx.drawImage(img, (160 - sw) / 2, (120 - sh) / 2, sw, sh);
        }
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
        await saveDetection({
          source: 'upload',
          dominant_emotion: top.dominantEmotion,
          emotions: top.emotions,
          confidence: top.confidence,
          face_count: results.length,
          thumbnail,
        });
        setSaved(true);
        onDetectionSaved();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [onDetectionSaved]);

  const topResult = detections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Upload / image area */}
        <div className="flex-1">
          {!imageUrl ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-[4/3] rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-4 transition-all ${
                dragOver
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                  : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
              }`}
            >
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-medium">Drop an image here or click to upload</p>
                <p className="text-sm text-slate-500 mt-1">JPG, PNG, WebP supported</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl">
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Upload preview"
                  className="w-full h-auto block"
                  onLoad={() => {
                    requestAnimationFrame(() => {
                      const img = imgRef.current;
                      const canvas = canvasRef.current;
                      if (img && canvas) {
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(img, 0, 0);
                      }
                    });
                  }}
                  style={{ display: 'none' }}
                />
                <canvas ref={canvasRef} className="w-full h-auto block" />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    'Analyze Image'
                  )}
                </button>
                <button
                  onClick={() => {
                    setImageUrl('');
                    setDetections([]);
                    setSaved(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 transition-colors"
                >
                  Choose Another
                </button>
                {saved && (
                  <span className="px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Saved to history
                  </span>
                )}
              </div>
            </div>
          )}

          {modelState === 'loading' && (
            <p className="mt-3 text-sm text-slate-400 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              Loading AI models…
            </p>
          )}
          {modelState === 'error' && (
            <p className="mt-3 text-sm text-red-400">{modelError}</p>
          )}
        </div>

        {/* Results panel */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Detection Results
            </h3>

            {!topResult ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">
                  {imageUrl
                    ? 'Click Analyze to detect emotions'
                    : 'Upload an image to begin'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl mb-2">
                    {EMOTIONS[getDominantEmotion(topResult.emotions as Record<EmotionKey, number>)].emoji}
                  </div>
                  <div className="text-xl font-bold text-white">
                    {EMOTIONS[getDominantEmotion(topResult.emotions as Record<EmotionKey, number>)].label}
                  </div>
                  <div className="text-sm text-slate-400">
                    {Math.round(topResult.confidence * 100)}% confidence
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(topResult.emotions).map(([key, value]) => {
                    const info = EMOTIONS[key as EmotionKey];
                    if (!info) return null;
                    const pct = Math.round(value * 100);
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300">{info.label}</span>
                          <span className="text-slate-400 font-mono">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${info.gradient} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-700/50 text-center text-xs text-slate-400">
                  {detections.length} face{detections.length !== 1 ? 's' : ''} detected
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
