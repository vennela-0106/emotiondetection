import { useState, useCallback } from 'react';
import { ScanFace, Upload, BarChart3, Brain, Camera, Sparkles } from 'lucide-react';
import WebcamDetector from '@/components/WebcamDetector';
import UploadDetector from '@/components/UploadDetector';
import HistoryDashboard from '@/components/HistoryDashboard';
import { EMOTION_LIST } from '@/lib/emotions';

type Tab = 'webcam' | 'upload' | 'history';

export default function App() {
  const [tab, setTab] = useState<Tab>('webcam');
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'webcam',
      label: 'Live Camera',
      icon: <Camera className="w-4 h-4" />,
      description: 'Real-time emotion detection from your webcam',
    },
    {
      id: 'upload',
      label: 'Image Upload',
      icon: <Upload className="w-4 h-4" />,
      description: 'Analyze emotions in any photo you upload',
    },
    {
      id: 'history',
      label: 'History & Stats',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'View past detections and emotion analytics',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-md bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <ScanFace className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">EmotionAI</h1>
                <p className="text-xs text-slate-400 -mt-0.5">Facial Emotion Detection</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Powered by Deep Learning
            </div>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20 text-cyan-300 text-xs font-medium mb-6">
            <Brain className="w-3.5 h-3.5" />
            AI-Powered Emotion Recognition
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Detect emotions in
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> real time</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Use your webcam or upload a photo to instantly analyze facial expressions.
            Our AI model recognizes seven different emotions with live confidence scores.
          </p>

          {/* Emotion chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {EMOTION_LIST.map((e) => (
              <div
                key={e.key}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 ring-1 ring-slate-700/50 text-sm"
              >
                <span className="text-base">{e.emoji}</span>
                <span className="text-slate-300">{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-400/40 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-800/30 ring-1 ring-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t.icon}
              <div className="text-left">
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-xs text-slate-500 hidden sm:block">{t.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-3xl bg-slate-900/40 ring-1 ring-slate-800/50 p-4 sm:p-6 lg:p-8 shadow-2xl">
          {tab === 'webcam' && <WebcamDetector onDetectionSaved={triggerRefresh} />}
          {tab === 'upload' && <UploadDetector onDetectionSaved={triggerRefresh} />}
          {tab === 'history' && (
            <HistoryDashboard refreshKey={refreshKey} onRefresh={triggerRefresh} />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-cyan-400" />
              <span>EmotionAI — Facial Emotion Detection</span>
            </div>
            <p>Runs entirely in your browser. No data sent to external servers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
