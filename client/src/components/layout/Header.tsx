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
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 tracking-tight text-base sm:text-lg">
                Turium AI
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                Knowledge Inbox
              </span>
            </div>
          </div>

          {/* Quick Stats & System Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Items count badge */}
            <div className="hidden md:flex items-center text-xs font-mono px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
              <span className="font-semibold mr-1">{totalItems}</span>
              <span className="text-stone-500">{totalItems === 1 ? 'item' : 'items'} saved</span>
            </div>

            {/* AI Mode badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-teal-50 text-teal-800 border border-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>{health?.aiMode === 'live' ? 'Live AI (Gemini + Groq)' : 'Demo AI Mode'}</span>
            </div>

            {/* Backend Health button */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-mono rounded-md border transition-colors cursor-pointer hover:bg-stone-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600"
              title="Click to view system diagnostics and architecture"
            >
              {loadingHealth ? (
                <span className="flex items-center text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1.5" />
                  <span className="hidden xs:inline">Connecting...</span>
                </span>
              ) : healthError ? (
                <span className="flex items-center text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  <span className="hidden xs:inline">Backend Offline</span>
                </span>
              ) : (
                <span className="flex items-center text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span className="hidden xs:inline">System Healthy</span>
                  <Activity className="w-3 h-3 ml-1 text-stone-400" />
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
