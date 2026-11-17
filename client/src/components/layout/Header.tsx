import { useState } from 'react';
import { Inbox, Activity, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { HealthStatus } from '../../types';
import { SystemModal } from './SystemModal';

interface HeaderProps {
  health: HealthStatus | null;
  loadingHealth: boolean;
  healthError: string | null;
  totalItems: number;
}

export function Header({ health, loadingHealth, healthError, totalItems }: HeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="border-b border-[#485148] bg-[#202420]/95 backdrop-blur-md sticky top-0 z-40 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#252E27] border border-[#3E4D42] flex items-center justify-center text-[#A8C8B5] shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#F1F0EA] tracking-tight text-base sm:text-lg">
                Turium AI
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-[#252E27] text-[#A8C8B5] border border-[#3E4D42]">
                Knowledge Inbox
              </span>
            </div>
          </div>

          {/* Quick Stats & System Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Items count badge */}
            <div className="hidden md:flex items-center text-xs font-mono px-2.5 py-1 rounded-lg bg-[#292D29] text-[#F1F0EA] border border-[#485148]">
              <span className="font-semibold text-[#A8C8B5] mr-1">{totalItems}</span>
              <span className="text-[#B8C0B6]">{totalItems === 1 ? 'item' : 'items'} saved</span>
            </div>

            {/* AI Mode badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-[#252E27] text-[#A8C8B5] border border-[#3E4D42]">
              <Sparkles className="w-3.5 h-3.5 text-[#A8C8B5]" />
              <span>{health?.aiMode === 'live' ? 'Live AI: Gemini + Groq' : 'Demo AI Mode'}</span>
            </div>

            {/* Backend Health button */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-mono rounded-lg border border-[#485148] bg-[#292D29] transition-colors cursor-pointer hover:bg-[#343A34] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A8C8B5]"
              title="Click to view system diagnostics and architecture"
            >
              {loadingHealth ? (
                <span className="flex items-center text-[#B8C0B6]">
                  <span className="w-2 h-2 rounded-full bg-[#FBBF24] animate-pulse mr-1.5" />
                  <span className="hidden xs:inline">Connecting...</span>
                </span>
              ) : healthError ? (
                <span className="flex items-center text-[#FB7185]">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-[#FB7185]" />
                  <span className="hidden xs:inline">Backend Offline</span>
                </span>
              ) : (
                <span className="flex items-center text-[#4ADE80]">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#4ADE80]" />
                  <span className="hidden xs:inline text-[#F1F0EA]">System Healthy</span>
                  <Activity className="w-3 h-3 ml-1 text-[#849082]" />
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Architecture & Diagnostics Modal */}
      <SystemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} health={health} />
    </>
  );
}
