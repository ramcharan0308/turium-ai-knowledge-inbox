import React, { useState } from 'react';
import { Globe, ShieldCheck, Download } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { api, ApiError } from '../../api/client';
import { IngestResponse } from '../../types';
import { useToast } from '../common/Toast';

interface UrlFormProps {
  onSuccess: (item: IngestResponse) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  setProgressMessage: (msg: string | null) => void;
}

export function UrlForm({
  onSuccess,
  isSubmitting,
  setIsSubmitting,
  setProgressMessage,
}: UrlFormProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const validateUrl = (rawUrl: string): boolean => {
    try {
      const parsed = new URL(rawUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please provide a valid website URL.');
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setError('Invalid URL format. URL must begin with http:// or https://');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setProgressMessage('Fetching remote webpage server-side & extracting article text...');

    try {
      const response = await api.ingest({
        type: 'url',
        content: trimmedUrl,
        title: title.trim() || undefined,
      });

      // Clear input on success
      setUrl('');
      setTitle('');

      showToast({
        type: 'success',
        title: 'URL Ingested',
        message: `Extracted and indexed "${response.title}" (${response.chunkCount} chunks).`,
      });

      onSuccess(response);
    } catch (err: unknown) {
      let message = 'Failed to ingest URL. Please verify the link is accessible.';
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
        label="Web Article or Documentation URL"
        required
        type="url"
        placeholder="https://example.com/blog/vector-search"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (error) setError(null);
        }}
        disabled={isSubmitting}
        error={error}
        leftIcon={<Globe className="w-4 h-4 text-[#849082]" />}
      />

      <Input
        label="Title Override (Optional)"
        placeholder="Custom title (defaults to parsed HTML title)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSubmitting}
        maxLength={200}
      />

      <div className="p-2.5 rounded-xl bg-[#202420] border border-[#485148] text-[11px] text-[#B8C0B6] flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#A8C8B5] shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Server-side scraper with connection-level SSRF safeguards. Private subnets, localhost, and cloud metadata
          endpoints are automatically rejected.
        </span>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={isSubmitting}
          loadingText="Fetching..."
          rightIcon={<Download className="w-3.5 h-3.5" />}
        >
          Fetch &amp; Ingest URL
        </Button>
      </div>
    </form>
  );
}
