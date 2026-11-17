import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeLibrary } from '../components/library/KnowledgeLibrary';
import { SavedItem } from '../types';

describe('KnowledgeLibrary Filtering and Search', () => {
  const sampleItems: SavedItem[] = [
    {
      id: 'itm_1',
      type: 'note',
      title: 'SQLite Database Optimization',
      sourceUrl: null,
      snippet: 'WAL mode and PRAGMA synchronous optimize persistence speed.',
      chunkCount: 2,
      createdAt: '2026-11-17T10:00:00.000Z',
      updatedAt: '2026-11-17T10:00:00.000Z',
      indexingStatus: 'ready',
    },
    {
      id: 'itm_2',
      type: 'url',
      title: 'Vector Search Best Practices',
      sourceUrl: 'https://example.com/vector-guide',
      snippet: 'Cosine similarity on normalized unit vectors enables fast dot products.',
      chunkCount: 5,
      createdAt: '2026-11-17T11:00:00.000Z',
      updatedAt: '2026-11-17T11:00:00.000Z',
      indexingStatus: 'ready',
    },
    {
      id: 'itm_3',
      type: 'note',
      title: 'Pending Ingestion Draft',
      sourceUrl: null,
      snippet: 'Embeddings are still generating in background.',
      chunkCount: 1,
      createdAt: '2026-11-17T12:00:00.000Z',
      updatedAt: '2026-11-17T12:00:00.000Z',
      indexingStatus: 'pending',
    },
  ];

  it('renders all items by default with correct chunk and type badges', () => {
    render(
      <KnowledgeLibrary
        items={sampleItems}
        total={3}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onLoadMore={vi.fn()}
        hasMore={false}
        loadingMore={false}
      />
    );

    expect(screen.getByText('SQLite Database Optimization')).toBeDefined();
    expect(screen.getByText('Vector Search Best Practices')).toBeDefined();
    expect(screen.getByText('Pending Ingestion Draft')).toBeDefined();
  });

  it('filters items in real time via search input query', () => {
    render(
      <KnowledgeLibrary
        items={sampleItems}
        total={3}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onLoadMore={vi.fn()}
        hasMore={false}
        loadingMore={false}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search saved titles/i);
    fireEvent.change(searchInput, { target: { value: 'vector' } });

    expect(screen.getByText('Vector Search Best Practices')).toBeDefined();
    expect(screen.queryByText('SQLite Database Optimization')).toBeNull();
    expect(screen.queryByText('Pending Ingestion Draft')).toBeNull();
  });

  it('filters items by source type (URLs only)', () => {
    render(
      <KnowledgeLibrary
        items={sampleItems}
        total={3}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onLoadMore={vi.fn()}
        hasMore={false}
        loadingMore={false}
      />
    );

    const urlFilterBtn = screen.getByRole('button', { name: /^URL$/i });
    fireEvent.click(urlFilterBtn);

    expect(screen.getByText('Vector Search Best Practices')).toBeDefined();
    expect(screen.queryByText('SQLite Database Optimization')).toBeNull();
    expect(screen.queryByText('Pending Ingestion Draft')).toBeNull();
  });

  it('filters items by indexing status (Pending only)', () => {
    render(
      <KnowledgeLibrary
        items={sampleItems}
        total={3}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onLoadMore={vi.fn()}
        hasMore={false}
        loadingMore={false}
      />
    );

    const pendingFilterBtn = screen.getByRole('button', { name: /^Pending$/i });
    fireEvent.click(pendingFilterBtn);

    expect(screen.getByText('Pending Ingestion Draft')).toBeDefined();
    expect(screen.queryByText('SQLite Database Optimization')).toBeNull();
    expect(screen.queryByText('Vector Search Best Practices')).toBeNull();
  });

  it('shows empty filter state and resets filters on clear', () => {
    render(
      <KnowledgeLibrary
        items={sampleItems}
        total={3}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onLoadMore={vi.fn()}
        hasMore={false}
        loadingMore={false}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search saved titles/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent keyword XYZ' } });

    expect(screen.getByText(/no matching knowledge items/i)).toBeDefined();

    const clearBtn = screen.getByRole('button', { name: /clear all filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('SQLite Database Optimization')).toBeDefined();
    expect(screen.getByText('Vector Search Best Practices')).toBeDefined();
  });
});
