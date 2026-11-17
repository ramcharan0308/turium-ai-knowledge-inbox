import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Inbox, CheckCircle2, AlertCircle, Sparkles, Terminal } from 'lucide-react';
import { api } from './api/client';
import { HealthStatus } from './types';

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .checkHealth()
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Could not connect to backend server');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-base">Turium AI</span>
              <span className="ml-2 px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Knowledge Inbox
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {loading ? (
              <span className="flex items-center text-xs font-mono text-slate-500">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-2" />
                Connecting...
              </span>
            ) : error ? (
              <span className="flex items-center text-xs font-mono text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Backend Offline
              </span>
            ) : (
              <span className="flex items-center text-xs font-mono text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                Backend Healthy (Node {health?.nodeVersion})
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {/* Hero Banner */}
          <div className="border border-slate-200 rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Phase 2 Foundation Ready</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Grounded Knowledge Ingestion & Retrieval
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Save notes, ingest web articles with SSRF guardrails, generate semantic embeddings, and ask
                  grounded questions with verifiable citations.
                </p>
              </div>

              {/* Status Specs Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 min-w-[260px] text-xs font-mono space-y-2">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  System Diagnostics
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Database:</span>
                  <span className="font-semibold text-slate-800">SQLite (node:sqlite)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Embedding:</span>
                  <span className="font-semibold text-slate-800">text-embedding-3-small</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">API Gateway:</span>
                  <span className="font-semibold text-slate-800">Express + Vite Proxy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scaffold Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Inbox className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">1. Ingestion Pipeline</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accepts raw text notes and URLs. Extracts sanitized text, enforces SSRF protections, and chunks content.
              </p>
              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                POST /ingest (Phase 3)
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">2. Vector Storage</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                SQLite database storing items and chunks. Vector embeddings stored and retrieved via fast in-memory dot product.
              </p>
              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                GET /items (Phase 3)
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">3. Grounded Q&amp;A</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Retrieves top-K semantic chunks, provides anti-hallucination guardrails, and renders verifiable source citations.
              </p>
              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                POST /query (Phase 4)
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 font-mono">
          <span>Turium AI Assignment — AI Knowledge Inbox</span>
          <span>Clarity over beauty · Zero-hallucination RAG</span>
        </div>
      </footer>
    </div>
  );
}
export default App;
