import { useState } from 'react';
import { Sparkles, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { QueryResult, Citation } from '../../types';
import { Badge } from '../common/Badge';
import { useToast } from '../common/Toast';

interface AnswerCardProps {
  result: QueryResult;
  selectedCitation: Citation | null;
  onSelectCitation: (citation: Citation) => void;
}

export function AnswerCard({
  result,
  selectedCitation,
  onSelectCitation,
}: AnswerCardProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const isRefusal =
    result.answer.trim().startsWith('Based on your saved notes and articles, there is insufficient information') ||
    result.citations.length === 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.answer);
      setCopied(true);
      showToast({
        type: 'info',
        message: 'Answer copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  /**
   * Render answer text, converting [S1], [S2] markers to interactive citation buttons
   */
  const renderFormattedAnswer = (text: string) => {
    const parts = text.split(/(\[S\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/^\[S(\d+)\]$/);
      if (match) {
        const sourceId = `S${match[1]}`;
        const citation = result.citations.find((c) => c.sourceId === sourceId);

        if (citation) {
          const isSelected = selectedCitation?.sourceId === sourceId;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectCitation(citation)}
              aria-label={`Inspect citation [${sourceId}] from "${citation.itemTitle}"`}
              className={`citation-pill inline-flex items-center px-1.5 py-0.5 mx-1 my-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ${
                isSelected
                  ? 'bg-teal-700 text-white ring-2 ring-teal-500 shadow-xs'
                  : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              [{sourceId}]
            </button>
          );
        }

        // If not in citation list, render safe plain text
        return (
          <span key={index} className="text-stone-500 font-mono text-xs">
            {part}
          </span>
        );
      }

      // Normal text segment
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      aria-live="polite"
      className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Answer Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-900 tracking-tight">Grounded RAG Answer</h3>
            <span className="text-[11px] font-mono text-stone-400">
              {result.mode === 'live' ? 'Groq LPU LLM + Gemini Embeddings' : 'Deterministic Extractive Synthesizer'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={result.mode === 'live' ? 'teal' : 'amber'} size="xs">
            {result.mode === 'live' ? 'Live AI' : 'Demo AI'}
          </Badge>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            title="Copy answer text"
            aria-label="Copy answer to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Strict Refusal Notice (Anti-Hallucination Guardrail) */}
      {isRefusal ? (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-950">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Anti-Hallucination Guardrail Triggered</span>
          </div>
          <p className="text-stone-600 leading-relaxed font-mono text-[11px]">
            The model evaluated your saved documents and determined there is insufficient factual evidence to answer
            this question. To prevent fabricated claims, no ungrounded citations or speculative statements were generated.
          </p>
        </div>
      ) : null}

      {/* Answer Body */}
      <div className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap font-normal">
        {renderFormattedAnswer(result.answer)}
      </div>

      {/* Available Citations Pill Bar */}
      {result.citations.length > 0 && (
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider font-semibold">
            Sources Cited:
          </span>
          {result.citations.map((c) => {
            const isSelected = selectedCitation?.sourceId === c.sourceId;
            return (
              <button
                key={c.sourceId}
                type="button"
                onClick={() => onSelectCitation(c)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-2xs font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/80'
                }`}
              >
                <span>[{c.sourceId}]</span>
                <span className="max-w-[120px] truncate">{c.itemTitle}</span>
                <span className="text-[10px] opacity-75">{Math.round(c.similarityScore * 100)}%</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Refusal with empty citations advice */}
      {isRefusal && result.citations.length === 0 && (
        <div className="pt-2 text-[11px] text-stone-400 font-mono flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
          <span>Tip: Ingest notes or articles mentioning the subject to allow the inbox to ground its answer.</span>
        </div>
      )}
    </div>
  );
}
