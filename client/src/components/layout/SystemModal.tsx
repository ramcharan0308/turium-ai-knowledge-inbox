import { useEffect } from 'react';
import { X, Server, Database, Sparkles, ShieldCheck, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HealthStatus } from '../../types';
import { Badge } from '../common/Badge';

interface SystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthStatus | null;
}

export function SystemModal({ isOpen, onClose, health }: SystemModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-diagnostics-title"
            className="relative bg-[#292D29] border border-[#485148] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#485148] flex items-center justify-between bg-[#202420]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#252E27] border border-[#3E4D42] flex items-center justify-center text-[#A8C8B5]">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="system-diagnostics-title" className="text-sm font-semibold text-[#F1F0EA]">
                    System Architecture &amp; Diagnostics
                  </h2>
                  <p className="text-xs text-[#B8C0B6] font-mono">Turium AI Knowledge Inbox Runtime</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#849082] hover:text-[#F1F0EA] rounded-lg hover:bg-[#343A34] transition-colors"
                aria-label="Close diagnostics dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Architecture Overview */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#849082] font-semibold">
                  Runtime Specifications
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl border border-[#485148] bg-[#202420]">
                    <span className="text-[#849082] block text-[10px] uppercase">Node.js Engine</span>
                    <span className="font-semibold text-[#F1F0EA] text-xs">{health?.nodeVersion || 'Node 26+'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[#485148] bg-[#202420]">
                    <span className="text-[#849082] block text-[10px] uppercase">Environment</span>
                    <span className="font-semibold text-[#F1F0EA] text-xs capitalize">{health?.environment || 'Development'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[#485148] bg-[#202420]">
                    <span className="text-[#849082] block text-[10px] uppercase">Persistence Engine</span>
                    <span className="font-semibold text-[#F1F0EA] text-xs flex items-center gap-1">
                      <Database className="w-3 h-3 text-[#A8C8B5]" />
                      SQLite (node:sqlite)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[#485148] bg-[#202420]">
                    <span className="text-[#849082] block text-[10px] uppercase">AI Operation Mode</span>
                    <Badge variant={health?.aiMode === 'live' ? 'eucalyptus' : 'amber'} size="xs" className="mt-0.5">
                      {health?.aiMode?.toUpperCase() || 'LIVE'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Vector & Model Configuration */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#849082] font-semibold">
                  Model &amp; Pipeline Configuration
                </div>
                <div className="border border-[#485148] rounded-xl divide-y divide-[#333933] bg-[#202420]">
                  <div className="p-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#F1F0EA] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#A8C8B5]" />
                        Embedding Model
                      </div>
                      <div className="text-[#B8C0B6] font-mono text-[11px] mt-0.5">
                        {health?.embeddingModel || 'gemini-embedding-001'} (Google Gen AI)
                      </div>
                    </div>
                    <Badge variant="eucalyptus" size="xs">
                      768 dims
                    </Badge>
                  </div>

                  <div className="p-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#F1F0EA] flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-[#D4A373]" />
                        Answer Generation LLM
                      </div>
                      <div className="text-[#B8C0B6] font-mono text-[11px] mt-0.5">
                        {health?.chatModel || 'openai/gpt-oss-120b'} (Groq LPU Hardware)
                      </div>
                    </div>
                    <Badge variant="cocoa" size="xs">
                      High-Speed LPU
                    </Badge>
                  </div>

                  <div className="p-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#F1F0EA] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                        Anti-Hallucination Guardrails
                      </div>
                      <div className="text-[#B8C0B6] font-mono text-[11px] mt-0.5">
                        Deterministic citation parsing, cosine similarity scoring &amp; strict refusal
                      </div>
                    </div>
                    <Badge variant="emerald" size="xs">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Safeguards Summary */}
              <div className="p-3 bg-[#202420] border border-[#485148] rounded-xl text-[#B8C0B6] leading-relaxed space-y-1">
                <div className="font-semibold text-[#F1F0EA] text-xs">Security &amp; Ingestion Invariants</div>
                <p className="text-[11px]">
                  - Connection-level DNS rebinding &amp; SSRF protections block loopback/cloud IPs directly at socket lookup.
                </p>
                <p className="text-[11px]">
                  - Content chunking produces 600-character segments with 110-character overlaps.
                </p>
                <p className="text-[11px]">
                  - Chunks are unit-normalized to enable fast local cosine similarity dot products in Node.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#485148] bg-[#202420] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-[#F1F0EA] bg-[#292D29] border border-[#485148] rounded-lg hover:bg-[#343A34] transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
