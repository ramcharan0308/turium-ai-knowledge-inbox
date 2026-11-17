import React, { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import { Input, Textarea } from '../common/Input';
import { Button } from '../common/Button';
import { api, ApiError } from '../../api/client';
import { IngestResponse } from '../../types';
import { useToast } from '../common/Toast';

interface NoteFormProps {
  onSuccess: (item: IngestResponse) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  setProgressMessage: (msg: string | null) => void;
}

export function NoteForm({
  onSuccess,
  isSubmitting,
  setIsSubmitting,
  setProgressMessage,
}: NoteFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const MAX_CHARS = 100000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError('Note content cannot be empty.');
      return;
    }

    if (trimmedContent.length > MAX_CHARS) {
      setError(`Content exceeds maximum limit of ${MAX_CHARS.toLocaleString()} characters.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setProgressMessage('Generating 768-dim Gemini embeddings & storing in SQLite...');

    try {
      const response = await api.ingest({
        type: 'note',
        title: title.trim() || undefined,
        content: trimmedContent,
      });

      // Clear form only on success
      setTitle('');
      setContent('');

      showToast({
        type: 'success',
        title: 'Note Saved',
        message: `"${response.title}" was saved and indexed successfully.`,
      });

      onSuccess(response);
    } catch (err: unknown) {
      let message = 'Failed to save note. Please try again.';
      if (err instanceof ApiError) {
        message = err.getUserMessage();
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      showToast({
        type: 'error',
        title: 'Ingestion Error',
        message,
      });
    } finally {
      setIsSubmitting(false);
      setProgressMessage(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label="Note Title (Optional)"
        placeholder="e.g. SQLite vector architecture notes"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSubmitting}
        maxLength={200}
      />

      <Textarea
        label="Note Content"
        required
        placeholder="Type or paste plain-text knowledge, meeting notes, code snippets, or thoughts..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        disabled={isSubmitting}
        charCount={content.length}
        maxChars={MAX_CHARS}
        error={error}
        rows={5}
      />

      <div className="flex justify-between items-center pt-1">
        <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1">
          <FileText className="w-3 h-3 text-stone-400" />
          <span>Deterministic 500-char chunking</span>
        </span>

        <Button
          type="submit"
          variant="terracotta"
          size="sm"
          loading={isSubmitting}
          loadingText="Ingesting..."
          rightIcon={<Send className="w-3.5 h-3.5" />}
        >
          Save Note
        </Button>
      </div>
    </form>
  );
}
