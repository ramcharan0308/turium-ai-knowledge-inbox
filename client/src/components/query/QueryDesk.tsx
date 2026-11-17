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
    <section className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden flex flex-col space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            Ask Your Knowledge
          </h2>
          <p className="text-xs text-stone-500">
            Natural-language semantic retrieval backed by citations and strict anti-hallucination
          </p>
        </div>

        {/* Top-K Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
          <label htmlFor="topK-select" className="text-stone-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-stone-400" />
            <span>Top-K:</span>
          </label>
          <select
            id="topK-select"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value, 10))}
            className="px-2 py-1 rounded-md border border-stone-300 text-stone-800 bg-stone-50 focus:outline-hidden focus:ring-1 focus:ring-teal-600 cursor-pointer"
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
            className={`w-full p-3 pr-10 text-xs sm:text-sm bg-stone-50/50 border rounded-xl placeholder:text-stone-400 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:bg-white transition-colors resize-none ${
              error ? 'border-rose-300' : 'border-stone-300'
            }`}
          />
          {question && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-1"
              aria-label="Clear question"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls & Hint */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
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
          <div className="pt-2 border-t border-stone-100 space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
              Suggested questions:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSampleClick(prompt)}
                  className="text-left text-xs font-mono text-stone-600 bg-stone-50 hover:bg-stone-100 hover:text-stone-900 border border-stone-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
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
        <div className="p-3 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-stone-500 font-mono">
          Save some notes or URLs on the left rail first to enable grounded vector search.
        </div>
      )}
    </section>
  );
}
