import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe, Loader2, PlayCircle } from 'lucide-react';
import userApi from '../utils/userApi.js';

const previewCache = new Map();

const LinkPreviewCard = ({ url, compact = false }) => {
  const [preview, setPreview] = useState(() => previewCache.get(url) || null);
  const [loading, setLoading] = useState(!preview);

  useEffect(() => {
    let active = true;
    if (!url) return undefined;
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    userApi
      .get('/api/link-preview', { params: { url } })
      .then(({ data }) => {
        if (!active || !data?.preview) return;
        previewCache.set(url, data.preview);
        setPreview(data.preview);
      })
      .catch(() => {
        if (!active) return;
        setPreview({
          url,
          finalUrl: url,
          title: url,
          description: '',
          siteName: '',
          image: '',
          embedUrl: '',
          kind: 'website',
          provider: '',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (!url) return null;
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-[1rem] border px-3 py-3 text-xs" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-muted)' }}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading link preview...
      </div>
    );
  }

  if (!preview) return null;

  const imageHeight = compact ? 'h-28' : 'h-40';

  return (
    <a
      href={preview.finalUrl || preview.url || url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block overflow-hidden rounded-[1rem] border transition-colors hover:border-[var(--brand-primary)]"
      style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}
    >
      {preview.provider === 'youtube' && preview.embedUrl ? (
        <iframe
          src={preview.embedUrl}
          title={preview.title || 'YouTube preview'}
          className={`w-full ${imageHeight}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : preview.image ? (
        <div className={`${imageHeight} overflow-hidden`} style={{ background: 'var(--c-panel-subtle)' }}>
          <img src={preview.image} alt={preview.title || 'Link preview'} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
      <div className="space-y-1.5 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
          {preview.provider === 'youtube' ? <PlayCircle className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          <span>{preview.siteName || preview.domain || 'External link'}</span>
        </div>
        <p className="text-sm font-black leading-5" style={{ color: 'var(--c-text)' }}>{preview.title || preview.url || url}</p>
        {preview.description ? <p className="text-xs leading-5" style={{ color: 'var(--c-text-soft)' }}>{preview.description}</p> : null}
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>
          <ExternalLink className="h-3.5 w-3.5" />
          Open link
        </div>
      </div>
    </a>
  );
};

export default LinkPreviewCard;
