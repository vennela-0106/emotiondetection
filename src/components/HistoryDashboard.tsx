import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  fetchDetections, deleteDetection, deleteAllDetections, type DetectionRecord,
} from '@/lib/detectionStore';
import { EMOTIONS, EMOTION_LIST, formatEmotionKey, type EmotionKey } from '@/lib/emotions';

dayjs.extend(relativeTime);

interface HistoryDashboardProps {
  refreshKey: number;
  onRefresh: () => void;
}

export default function HistoryDashboard({ refreshKey, onRefresh }: HistoryDashboardProps) {
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDetections(200);
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [refreshKey, load]);

  const handleDelete = async (id: string) => {
    const ok = await deleteDetection(id);
    if (ok) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleClearAll = async () => {
    const ok = await deleteAllDetections();
    if (ok) {
      setRecords([]);
      setConfirmClear(false);
    }
  };

  // Aggregate stats
  const emotionCounts: Record<string, number> = {};
  const sourceCounts = { webcam: 0, upload: 0 };
  for (const r of records) {
    emotionCounts[r.dominant_emotion] = (emotionCounts[r.dominant_emotion] || 0) + 1;
    sourceCounts[r.source]++;
  }

  const pieData = EMOTION_LIST.map((e) => ({
    name: e.label,
    value: emotionCounts[e.key] || 0,
    color: e.color,
  })).filter((d) => d.value > 0);

  // Timeline data (last 20 detections)
  const timelineData = [...records].slice(0, 20).reverse().map((r, i) => ({
    index: i + 1,
    emotion: EMOTIONS[formatEmotionKey(r.dominant_emotion)].label,
    confidence: Math.round(r.confidence * 100),
    color: EMOTIONS[formatEmotionKey(r.dominant_emotion)].color,
  }));

  const totalDetections = records.length;
  const avgConfidence = totalDetections > 0
    ? Math.round((records.reduce((sum, r) => sum + r.confidence, 0) / totalDetections) * 100)
    : 0;
  const mostCommonEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Detections" value={totalDetections} icon="scan" />
        <StatCard label="Avg Confidence" value={`${avgConfidence}%`} icon="gauge" />
        <StatCard
          label="Most Common"
          value={mostCommonEmotion ? EMOTIONS[formatEmotionKey(mostCommonEmotion[0])].label : '—'}
          icon="star"
        />
        <StatCard
          label="Webcam / Upload"
          value={`${sourceCounts.webcam} / ${sourceCounts.upload}`}
          icon="split"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalDetections === 0 ? (
        <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3 3h18m-18 0L3 7.5M21 3v11.25A2.25 2.25 0 0 1 18.75 16.5H16.5m0 0V21m-2.25-4.5H9.75M7.5 21V16.5m0 0H6A2.25 2.25 0 0 1 3.75 14.25V7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-200">No detections yet</h3>
          <p className="text-sm text-slate-400 mt-2">
            Use the live camera or upload an image to start building your emotion history.
          </p>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Emotion Distribution
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Confidence Timeline (Recent 20)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="index" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                    formatter={(value) => [`${value}%`, 'Confidence']}
                    labelFormatter={(label) => `Detection #${label}`}
                  />
                  <Bar dataKey="confidence" radius={[4, 4, 0, 0]}>
                    {timelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History table */}
          <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Detection History
              </h3>
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                    <th className="px-5 py-3 font-medium">Thumbnail</th>
                    <th className="px-5 py-3 font-medium">Emotion</th>
                    <th className="px-5 py-3 font-medium">Source</th>
                    <th className="px-5 py-3 font-medium">Confidence</th>
                    <th className="px-5 py-3 font-medium">Faces</th>
                    <th className="px-5 py-3 font-medium">When</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const info = EMOTIONS[formatEmotionKey(r.dominant_emotion)];
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-5 py-3">
                          {r.thumbnail ? (
                            <img
                              src={r.thumbnail}
                              alt="Detection thumbnail"
                              className="w-14 h-10 rounded-lg object-cover ring-1 ring-slate-600/50"
                            />
                          ) : (
                            <div className="w-14 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-500 text-xs">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-lg">{info.emoji}</span>
                            <span className="font-medium text-slate-200">{info.label}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.source === 'webcam'
                                ? 'bg-cyan-500/15 text-cyan-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {r.source}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-300 font-mono">
                          {Math.round(r.confidence * 100)}%
                        </td>
                        <td className="px-5 py-3 text-slate-300">{r.face_count}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">
                          {dayjs(r.created_at).fromNow()}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.347 9a2.25 2.25 0 0 1-2.24 2.087H7.847a2.25 2.25 0 0 1-2.24-2.087L5.26 9m5.99 0V6a2.25 2.25 0 0 0-2.25-2.25H6.51A2.25 2.25 0 0 0 4.26 6v3m5.99 0h4.5m-4.5 0H5.26m9 0V5.25A2.25 2.25 0 0 0 12.01 3h-2.5a2.25 2.25 0 0 0-2.25 2.25V9" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Clear all confirmation */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl ring-1 ring-slate-700 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Clear all detections?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently delete all {totalDetections} detection records. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    scan: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3 3h18m-18 0L3 7.5M21 3v11.25A2.25 2.25 0 0 1 18.75 16.5H16.5m0 0V21m-2.25-4.5H9.75M7.5 21V16.5m0 0H6A2.25 2.25 0 0 1 3.75 14.25V7.5" />
      </svg>
    ),
    gauge: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5a9 9 0 1 1 18 0M12 13.5l3-3m-3 3l-3-3" />
      </svg>
    ),
    star: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.71 17.82a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
    split: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  };

  return (
    <div className="rounded-2xl bg-slate-800/40 ring-1 ring-slate-700/50 p-5">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icons[icon]}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
