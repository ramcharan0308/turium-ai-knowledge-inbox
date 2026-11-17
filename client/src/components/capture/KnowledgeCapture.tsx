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
    <div className="bg-[#292D29] border border-[#485148] rounded-2xl shadow-xs overflow-hidden">
      {/* Capture Header & Tab Selector */}
      <div className="px-5 py-4 border-b border-[#485148] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#202420]">
        <div>
          <h2 className="text-sm font-semibold text-[#F1F0EA] tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#A8C8B5]" />
            Knowledge Capture
          </h2>
          <p className="text-xs text-[#B8C0B6]">Save thoughts or scrape articles into the vector store</p>
        </div>

        {/* Segmented Pill Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[#191B19] border border-[#485148] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'note'
                ? 'bg-[#2D2319] text-[#D4A373] border border-[#4D3C2C] shadow-2xs font-semibold'
                : 'text-[#B8C0B6] hover:text-[#F1F0EA] border border-transparent'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'note' ? 'text-[#D4A373]' : 'text-[#849082]'}`} />
            <span>Plain Note</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-[#252E27] text-[#A8C8B5] border border-[#3E4D42] shadow-2xs font-semibold'
                : 'text-[#B8C0B6] hover:text-[#F1F0EA] border border-transparent'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${activeTab === 'url' ? 'text-[#A8C8B5]' : 'text-[#849082]'}`} />
            <span>Web URL</span>
          </button>
        </div>
      </div>

      {/* Progress Notification Banner */}
      {progressMessage && (
        <div className="px-5 py-2.5 bg-[#252E27] border-b border-[#3E4D42] flex items-center gap-2 text-xs text-[#A8C8B5] font-mono animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A8C8B5] shrink-0" />
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
