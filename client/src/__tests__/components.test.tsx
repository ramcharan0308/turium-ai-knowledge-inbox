import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteForm } from '../components/capture/NoteForm';
import { UrlForm } from '../components/capture/UrlForm';
import { AnswerCard } from '../components/query/AnswerCard';
import { CitationInspector } from '../components/query/CitationInspector';
import { ToastProvider } from '../components/common/Toast';
import { QueryResult, Citation } from '../types';

describe('NoteForm Component', () => {
  it('displays validation error when submitted with empty content', async () => {
    const handleSuccess = vi.fn();
    const setIsSubmitting = vi.fn();
    const setProgress = vi.fn();

    render(
      <ToastProvider>
        <NoteForm
          onSuccess={handleSuccess}
          isSubmitting={false}
          setIsSubmitting={setIsSubmitting}
          setProgressMessage={setProgress}
        />
      </ToastProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /save note/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/note content cannot be empty/i)).toBeDefined();
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});

describe('UrlForm Component', () => {
  it('displays validation error for empty URL submission', async () => {
    const handleSuccess = vi.fn();
    const setIsSubmitting = vi.fn();
    const setProgress = vi.fn();

    render(
      <ToastProvider>
        <UrlForm
          onSuccess={handleSuccess}
          isSubmitting={false}
          setIsSubmitting={setIsSubmitting}
          setProgressMessage={setProgress}
        />
      </ToastProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /fetch & ingest url/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/please provide a valid website url/i)).toBeDefined();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it('rejects invalid protocol URLs (e.g. ftp:// or file://)', async () => {
    const handleSuccess = vi.fn();
    const setIsSubmitting = vi.fn();
    const setProgress = vi.fn();

    render(
      <ToastProvider>
        <UrlForm
          onSuccess={handleSuccess}
          isSubmitting={false}
          setIsSubmitting={setIsSubmitting}
          setProgressMessage={setProgress}
        />
      </ToastProvider>
    );

    const input = screen.getByPlaceholderText(/https:\/\/example\.com/i);
    fireEvent.change(input, { target: { value: 'file:///etc/passwd' } });

    const submitBtn = screen.getByRole('button', { name: /fetch & ingest url/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/url must begin with http:\/\/ or https:\/\//i)).toBeDefined();
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});

describe('AnswerCard & Citation Interaction', () => {
  const sampleCitation: Citation = {
    sourceId: 'S1',
    chunkId: 'chk_100',
    itemId: 'itm_100',
    itemTitle: 'SQLite Storage Architecture',
    itemType: 'note',
    sourceUrl: null,
    chunkIndex: 0,
    snippet: 'Turium AI persists documents in SQLite using cosine similarity vectors.',
    similarityScore: 0.884,
  };

  const sampleResult: QueryResult = {
    question: 'Where is data stored?',
    answer: 'Data is stored in a local SQLite database [S1].',
    citations: [sampleCitation],
    mode: 'live',
  };

  it('renders answer with interactive citation pill and handles clicks', () => {
    const handleSelectCitation = vi.fn();

    render(
      <ToastProvider>
        <AnswerCard
          result={sampleResult}
          selectedCitation={null}
          onSelectCitation={handleSelectCitation}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Data is stored in a local SQLite database/i)).toBeDefined();

    // The [S1] citation pill
    const citationBtn = screen.getByRole('button', { name: /inspect citation \[S1\]/i });
    expect(citationBtn).toBeDefined();

    fireEvent.click(citationBtn);
    expect(handleSelectCitation).toHaveBeenCalledWith(sampleCitation);
  });

  it('renders anti-hallucination banner when refusal message is returned', () => {
    const refusalResult: QueryResult = {
      question: 'Unknown topic',
      answer: 'Based on your saved notes and articles, there is insufficient information to answer this question.',
      citations: [],
      mode: 'live',
    };

    render(
      <ToastProvider>
        <AnswerCard
          result={refusalResult}
          selectedCitation={null}
          onSelectCitation={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Anti-Hallucination Guardrail Triggered/i)).toBeDefined();
    expect(screen.getByText(/no ungrounded citations or speculative statements were generated/i)).toBeDefined();
  });
});

describe('CitationInspector Component', () => {
  const sampleCitation: Citation = {
    sourceId: 'S1',
    chunkId: 'chk_sample_id',
    itemId: 'itm_sample_id',
    itemTitle: 'Distributed Vector Retrieval',
    itemType: 'url',
    sourceUrl: 'https://example.com/vector-search',
    chunkIndex: 2,
    snippet: 'Cosine similarity is computed via dot products on normalized vectors.',
    similarityScore: 0.923,
  };

  it('displays detailed chunk metadata, score percentage, and snippet text', () => {
    const handleSelect = vi.fn();

    render(
      <CitationInspector
        citations={[sampleCitation]}
        selectedCitation={sampleCitation}
        onSelectCitation={handleSelect}
      />
    );

    expect(screen.getByText(/Distributed Vector Retrieval/i)).toBeDefined();
    expect(screen.getByText(/92% \(0.923\)/i)).toBeDefined();
    expect(screen.getByText(/Chunk #2/i)).toBeDefined();
    expect(screen.getByText(/Chunk ID: chk_sample_id/i)).toBeDefined();
    expect(screen.getByText(/Cosine similarity is computed via dot products on normalized vectors/i)).toBeDefined();
  });
});
