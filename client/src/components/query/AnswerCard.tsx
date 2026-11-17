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
                  ? 'bg-[#A8C8B5] text-[#191B19] ring-2 ring-[#A8C8B5]/50 shadow-xs'
                  : 'bg-[#252E27] text-[#A8C8B5] border border-[#3E4D42] hover:bg-[#2E3B32]'
              }`}
            >
              [{sourceId}]
            </button>
          );
        }

        // If not in citation list, render safe plain text
        return (
          <span key={index} className="text-[#849082] font-mono text-xs">
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
      className="bg-[#292D29] border border-[#485148] rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Answer Header */}
      <div className="flex items-center justify-between border-b border-[#384038] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#252E27] border border-[#3E4D42] flex items-center justify-center text-[#A8C8B5]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#F1F0EA] tracking-tight">Grounded RAG Answer</h3>
            <span className="text-[11px] font-mono text-[#849082]">
              {result.mode === 'live' ? 'Groq LPU LLM + Gemini Embeddings' : 'Deterministic Extractive Synthesizer'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={result.mode === 'live' ? 'eucalyptus' : 'amber'} size="xs">
            {result.mode === 'live' ? 'Live AI' : 'Demo AI'}
          </Badge>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-[#849082] hover:text-[#F1F0EA] rounded-lg hover:bg-[#343A34] transition-colors cursor-pointer"
            title="Copy answer text"
            aria-label="Copy answer to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Strict Refusal Notice (Anti-Hallucination Guardrail) */}
      {isRefusal ? (
        <div className="p-3.5 rounded-xl bg-[#332814] border border-[#54411C] text-xs text-[#FBBF24] space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-[#FBBF24]">
            <ShieldCheck className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <span>Anti-Hallucination Guardrail Triggered</span>
          </div>
          <p className="text-[#E5D5BA] leading-relaxed font-mono text-[11px]">
            The model evaluated your saved documents and determined there is insufficient factual evidence to answer
            this question. To prevent fabricated claims, no ungrounded citations or speculative statements were generated.
          </p>
        </div>
      ) : null}

      {/* Answer Body */}
      <div className="text-sm text-[#F1F0EA] leading-relaxed whitespace-pre-wrap font-normal">
        {renderFormattedAnswer(result.answer)}
      </div>

      {/* Available Citations Pill Bar */}
      {result.citations.length > 0 && (
        <div className="pt-3 border-t border-[#384038] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-mono text-[#849082] uppercase tracking-wider font-semibold">
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
                    ? 'bg-[#A8C8B5] text-[#191B19] shadow-2xs font-bold'
                    : 'bg-[#202420] text-[#B8C0B6] hover:text-[#F1F0EA] hover:bg-[#343A34] border border-[#485148]'
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
        <div className="pt-2 text-[11px] text-[#849082] font-mono flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-[#849082]" />
          <span>Tip: Ingest notes or articles mentioning the subject to allow the inbox to ground its answer.</span>
        </div>
      )}
    </div>
  );
}
