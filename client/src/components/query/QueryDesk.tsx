import React, { useState } from 'react';
import { HelpCircle, Send, Sparkles, X, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { QueryResult, Citation, SavedItem } from '../../types';
import { Button } from '../common/Button';
import { AnswerCard } from './AnswerCard';
import { CitationInspector } from './CitationInspector';
import { useToast } from '../common/Toast';

interface QueryDeskProps {
  items: SavedItem[];
}

export function QueryDesk({ items }: QueryDeskProps) {
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const { showToast } = useToast();

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      setError('Please enter a question to query your saved knowledge.');
      return;
    }

    setError(null);
    setLoading(true);
    setSelectedCitation(null);

    try {
      const result = await api.query(trimmed, topK);
      setQueryResult(result);

      // Auto-select first citation if available
      if (result.citations.length > 0) {
        setSelectedCitation(result.citations[0]);
      }
    } catch (err: unknown) {
      let message = 'Failed to generate answer. Please try again.';
      if (err instanceof ApiError) {
        message = err.getUserMessage();
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      showToast({
        type: 'error',
        title: 'Query Error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleSampleClick = (sampleQuestion: string) => {
    setQuestion(sampleQuestion);
  };

  const handleClear = () => {
    setQuestion('');
    setQueryResult(null);
    setSelectedCitation(null);
    setError(null);
  };

  const samplePrompts = [
    'Where does Turium AI Knowledge Inbox store documents and vectors?',
    'What safeguards protect URL scraping against SSRF attacks?',
    'How does text chunking work for long articles?',
  ];

  return (
    <section className="bg-[#292D29] border border-[#485148] rounded-2xl shadow-xs overflow-hidden flex flex-col space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#384038] pb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F1F0EA] tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#A8C8B5]" />
            Ask Your Knowledge
          </h2>
          <p className="text-xs text-[#B8C0B6]">
            Natural-language semantic retrieval backed by citations and strict anti-hallucination
          </p>
        </div>

        {/* Top-K Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
          <label htmlFor="topK-select" className="text-[#849082] flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#849082]" />
            <span>Top-K:</span>
          </label>
          <select
            id="topK-select"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value, 10))}
            className="px-2 py-1 rounded-md border border-[#485148] text-[#F1F0EA] bg-[#202420] focus:outline-hidden focus:ring-1 focus:ring-[#A8C8B5] focus:border-[#A8C8B5] cursor-pointer"
          >
            <option value={2}>2 chunks</option>
            <option value={4}>4 chunks (recommended)</option>
            <option value={6}>6 chunks</option>
            <option value={8}>8 chunks</option>
          </select>
        </div>
      </div>

      {/* Query Form */}
      <form onSubmit={handleAsk} className="space-y-3">
        <div className="relative">
          <textarea
            rows={3}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your saved notes and web articles (e.g. 'What is the storage mechanism?')..."
            disabled={loading}
            className={`w-full p-3 pr-10 text-xs sm:text-sm bg-[#202420] border rounded-xl placeholder:text-[#849082] text-[#F1F0EA] focus:outline-hidden focus:ring-2 focus:ring-[#A8C8B5]/25 focus:border-[#A8C8B5] focus:bg-[#252A25] transition-colors resize-none ${
              error ? 'border-[#FB7185]' : 'border-[#485148]'
            }`}
          />
          {question && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 text-[#849082] hover:text-[#F1F0EA] p-1 cursor-pointer"
              aria-label="Clear question"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls & Hint */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[#849082] flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#849082] shrink-0" />
            <span>Press Enter to ask, Shift+Enter for newline</span>
          </div>

          <div className="flex items-center gap-2">
            {queryResult && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                Reset
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              loadingText="Retrieving & Answering..."
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Ask Knowledge
            </Button>
          </div>
        </div>

        {/* Quick Sample Prompts */}
        {!queryResult && !loading && (
          <div className="pt-2 border-t border-[#384038] space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#849082]">
              Suggested questions:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSampleClick(prompt)}
                  className="text-left text-xs font-mono text-[#B8C0B6] bg-[#202420] hover:bg-[#343A34] hover:text-[#F1F0EA] border border-[#485148] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Query Error Notice */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[#2D1D20] border border-[#54222B] text-xs text-[#FB7185] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold">Unable to process query</div>
            <div className="font-mono text-[11px]">{error}</div>
          </div>
        </div>
      )}

      {/* Grounded Answer Card */}
      {queryResult && (
        <div className="space-y-3 pt-2">
          <AnswerCard
            result={queryResult}
            selectedCitation={selectedCitation}
            onSelectCitation={setSelectedCitation}
          />

          {/* Citation Source Inspector */}
          <CitationInspector
            citations={queryResult.citations}
            selectedCitation={selectedCitation}
            onSelectCitation={setSelectedCitation}
          />
        </div>
      )}

      {/* Hint when Inbox is empty */}
      {items.length === 0 && !queryResult && (
        <div className="p-3 rounded-xl bg-[#202420] border border-dashed border-[#485148] text-center text-xs text-[#B8C0B6] font-mono">
          Save some notes or URLs on the left rail first to enable grounded vector search.
        </div>
      )}
    </section>
  );
}
