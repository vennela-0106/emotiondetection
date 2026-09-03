import { useEffect, useRef, useState, useCallback } from 'react';
import { loadFaceModels, detectFacesInImage, type DetectionResult } from '@/lib/faceApi';
import { EMOTIONS, getDominantEmotion, type EmotionKey } from '@/lib/emotions';
import { saveDetection } from '@/lib/detectionStore';

interface WebcamDetectorProps {
  onDetectionSaved: () => void;
}

export default function WebcamDetector({ onDetectionSaved }: WebcamDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastSaveRef = useRef<number>(0);

  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelError, setModelError] = useState('');
  const [cameraState, setCameraState] = useState<'off' | 'starting' | 'on' | 'error'>('off');
  const [cameraError, setCameraError] = useState('');
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [autoSave, setAutoSave] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    setModelState('loading');
    loadFaceModels()
      .then(() => setModelState('ready'))
      .catch((err) => {
        setModelState('error');
        setModelError(err instanceof Error ? err.message : 'Failed to load AI models');
      });
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState('starting');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('on');
      startLoop();
    } catch (err) {
      setCameraState('error');
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Could not access camera. Please grant permission.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('off');
    setDetections([]);
  }, []);

  const startLoop = useCallback(() => {
    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const results = await detectFacesInImage(video);
        setDetections(results);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        for (const d of results) {
          const dominantKey = getDominantEmotion(d.emotions as Record<EmotionKey, number>);
          const info = EMOTIONS[dominantKey];
          ctx.strokeStyle = info.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(d.box.x, d.box.y, d.box.width, d.box.height, 8);
          ctx.stroke();

          const label = `${info.emoji} ${info.label} ${Math.round(d.confidence * 100)}%`;
          ctx.font = 'bold 16px sans-serif';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = info.color;
          ctx.beginPath();
          ctx.roundRect(d.box.x, d.box.y - 26, textWidth + 16, 22, 6);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, d.box.x + 8, d.box.y - 10);
        }

        if (
          autoSave &&
          results.length > 0 &&
          Date.now() - lastSaveRef.current > 5000
        ) {
          lastSaveRef.current = Date.now();
          const top = results[0];
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 160;
          thumbCanvas.height = 120;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(video, 0, 0, 160, 120);
          }
          const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
          await saveDetection({
            source: 'webcam',
            dominant_emotion: top.dominantEmotion,
            emotions: top.emotions,
            confidence: top.confidence,
            face_count: results.length,
            thumbnail,
          });
          setSaveFlash(true);
          setTimeout(() => setSaveFlash(false), 800);
          onDetectionSaved();
        }
      } catch {
        // detection errors are non-fatal in a live loop
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [autoSave, onDetectionSaved]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const topResult = detections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Camera area */}
        <div className="flex-1">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {cameraState === 'off' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.75.175-1.093.406C3.5 8.093 3.5 9.5 3.5 12s0 3.907.593 4.364c.343.23.713.352 1.093.406a2.31 2.31 0 0 1 1.64 1.055C7.336 19.437 8.5 21 12 21s4.664-1.563 5.814-3.175a2.31 2.31 0 0 1 1.641-1.055c.38-.054.75-.175 1.093-.406C21.5 15.907 21.5 14.5 21.5 12s0-3.907-.593-4.364a2.31 2.31 0 0 0-1.093-.406 2.31 2.31 0 0 1-1.641-1.055C16.664 4.563 15.5 3 12 3S7.336 4.563 6.827 6.175Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </div>
                <p className="text-sm">Camera is off</p>
              </div>
            )}

            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                <div className="animate-pulse text-lg">Starting camera…</div>
              </div>
            )}

            {saveFlash && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-lg animate-pulse">
                Saved to history
              </div>
            )}

            {cameraState === 'on' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {cameraState === 'off' ? (
              <button
                onClick={startCamera}
                disabled={modelState !== 'ready'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all"
              >
                Stop Camera
              </button>
            )}

            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 text-slate-200 cursor-pointer hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-sm font-medium">Auto-save to history</span>
            </label>
          </div>

          {modelState === 'loading' && (
            <p className="mt-3 text-sm text-slate-400 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              Loading AI models…
            </p>
          )}
          {modelState === 'error' && (
            <p className="mt-3 text-sm text-red-400">{modelError}</p>
          )}
          {cameraState === 'error' && (
            <p className="mt-3 text-sm text-red-400">{cameraError}</p>
          )}
        </div>

        {/* Live results panel */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Live Analysis
            </h3>

            {!topResult ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">
                  {cameraState === 'on'
                    ? 'Looking for faces…'
                    : 'Start the camera to begin detection'}
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
                            className={`h-full rounded-full bg-gradient-to-r ${info.gradient} transition-all duration-300`}
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
