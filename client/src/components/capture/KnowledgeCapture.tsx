import { useState } from 'react';
import { FileText, Globe, Loader2, Sparkles } from 'lucide-react';
import { NoteForm } from './NoteForm';
import { UrlForm } from './UrlForm';
import { IngestResponse } from '../../types';

interface KnowledgeCaptureProps {
  onIngestSuccess: (item: IngestResponse) => void;
}

export function KnowledgeCapture({ onIngestSuccess }: KnowledgeCaptureProps) {
  const [activeTab, setActiveTab] = useState<'note' | 'url'>('note');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Capture Header & Tab Selector */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/40">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            Knowledge Capture
          </h2>
          <p className="text-xs text-stone-500">Save thoughts or scrape articles into the vector store</p>
        </div>

        {/* Segmented Pill Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'note'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'note' ? 'text-orange-700' : 'text-stone-400'}`} />
            <span>Plain Note</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'url'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${activeTab === 'url' ? 'text-teal-700' : 'text-stone-400'}`} />
            <span>Web URL</span>
          </button>
        </div>
      </div>

      {/* Progress Notification Banner */}
      {progressMessage && (
        <div className="px-5 py-2.5 bg-teal-50/70 border-b border-teal-100 flex items-center gap-2 text-xs text-teal-800 font-mono animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700 shrink-0" />
          <span>{progressMessage}</span>
        </div>
      )}

      {/* Form Container */}
      <div className="p-5">
        {activeTab === 'note' ? (
          <NoteForm
            onSuccess={onIngestSuccess}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            setProgressMessage={setProgressMessage}
          />
        ) : (
          <UrlForm
            onSuccess={onIngestSuccess}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            setProgressMessage={setProgressMessage}
          />
        )}
      </div>
    </div>
  );
}
