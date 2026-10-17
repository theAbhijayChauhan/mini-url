import React, { useState } from 'react';
import {
  Link2,
  Sparkles,
  SlidersHorizontal,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Flame,
} from 'lucide-react';
import { ShortenFormValues, UrlItem } from '../types';
import { copyToClipboard } from '../lib/utils';

interface ShortenCardProps {
  onShorten: (values: ShortenFormValues) => Promise<UrlItem>;
  onOpenQr: (url: string, shortCode: string) => void;
}

export const ShortenCard: React.FC<ShortenCardProps> = ({ onShorten, onOpenQr }) => {
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [title, setTitle] = useState('');
  // Default to 5 days for ephemeral conversation links!
  const [expiresInDays, setExpiresInDays] = useState<number>(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentResult, setRecentResult] = useState<UrlItem | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!url.trim()) {
      setErrorMessage('Please enter a destination URL.');
      return;
    }

    try {
      setIsLoading(true);
      const newUrl = await onShorten({
        url: url.trim(),
        customSlug: customSlug.trim() || undefined,
        title: title.trim() || undefined,
        expiresInDays: expiresInDays,
      });

      setRecentResult(newUrl);
      setUrl('');
      setCustomSlug('');
      setTitle('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to shorten URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {}
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Shorten Box */}
      <div className="relative rounded-2xl bg-forest-900/90 border border-palette-sage/20 shadow-xl p-5 sm:p-8 backdrop-blur-xl">
        {/* Soft Organic Backlights using palette colors */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-palette-mint/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-palette-emerald/10 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="relative space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-semibold text-palette-cream flex items-center space-x-2">
              <Link2 className="h-4 w-4 text-palette-emerald" />
              <span>Paste Long Destination URL</span>
            </label>
            <button
              type="button"
              onClick={handlePaste}
              className="text-xs text-palette-mint hover:text-palette-cream font-medium transition-colors touch-manipulation"
            >
              Paste from clipboard
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very-long-url-path"
              className="w-full px-4 py-3.5 pl-11 bg-forest-950/90 border border-palette-sage/25 focus:border-palette-emerald focus:ring-2 focus:ring-palette-emerald/20 rounded-xl text-white placeholder-palette-sage/50 text-base sm:text-sm outline-none transition-all touch-manipulation font-sans"
              required
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-palette-sage/60 pointer-events-none">
              <Link2 className="h-4 w-4" />
            </div>
          </div>

          {/* Lifespan & Auto-Cleanup Selector (Default 5 Days) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-palette-cream flex items-center space-x-1.5">
                <Clock className="h-3.5 w-3.5 text-palette-mint" />
                <span>Link Lifespan (Auto-purges to save space):</span>
              </span>
              <span className="text-[11px] text-palette-sage/80 font-mono">
                {expiresInDays === 0 ? 'Forever' : `Auto-deletes in ${expiresInDays} days`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '⚡ 24 Hours', days: 1, desc: 'Quick chats' },
                { label: '🌿 5 Days', days: 5, desc: 'Recommended', isDefault: true },
                { label: '📅 30 Days', days: 30, desc: 'Monthly project' },
                { label: '🔒 Permanent', days: 0, desc: 'Never expires' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setExpiresInDays(opt.days)}
                  className={`py-2 px-2.5 rounded-xl text-left border transition-all touch-manipulation ${
                    expiresInDays === opt.days
                      ? 'bg-palette-emerald/15 border-palette-emerald text-white shadow-sm shadow-palette-emerald/10'
                      : 'bg-forest-950/60 border-palette-sage/15 text-palette-sage/80 hover:border-palette-sage/40 hover:text-palette-cream'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{opt.label}</span>
                    {opt.isDefault && (
                      <span className="text-[9px] uppercase font-bold px-1 rounded bg-palette-mint/20 text-palette-mint">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] block opacity-70 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-1.5 text-xs font-medium text-palette-sage/90 hover:text-palette-cream transition-colors py-1 touch-manipulation"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-palette-mint" />
              <span>{showAdvanced ? 'Hide custom options' : 'Custom alias & title'}</span>
            </button>
          </div>

          {/* Advanced Options Accordion */}
          {showAdvanced && (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Custom Slug */}
              <div>
                <label className="block text-xs font-medium text-palette-sage/90 mb-1">
                  Custom Slug (e.g. mini.url/my-alias)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-palette-sage/60 font-mono">
                    /
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="custom-slug"
                    className="w-full pl-6 pr-3 py-2.5 bg-forest-950/70 border border-palette-sage/20 focus:border-palette-emerald rounded-lg text-base sm:text-xs text-white placeholder-palette-sage/50 outline-none transition-all touch-manipulation font-mono"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-palette-sage/90 mb-1">
                  Internal Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CS50 Assignment Link"
                  className="w-full px-3 py-2.5 bg-forest-950/70 border border-palette-sage/20 focus:border-palette-emerald rounded-lg text-base sm:text-xs text-white placeholder-palette-sage/50 outline-none transition-all touch-manipulation"
                />
              </div>
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl font-bold text-forest-950 bg-gradient-to-r from-palette-emerald via-palette-mint to-palette-cream hover:opacity-95 active:scale-[0.99] shadow-md shadow-palette-emerald/25 transition-all disabled:opacity-60 cursor-pointer touch-manipulation"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 border-2 border-forest-950/30 border-t-forest-950 rounded-full animate-spin" />
                <span>Shortening at Cloudflare Edge...</span>
              </div>
            ) : (
              <>
                <Link2 className="h-4 w-4 stroke-[2.5]" />
                <span>Shorten & Generate Mini URL</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Feature Badges */}
        <div className="mt-6 pt-5 border-t border-palette-sage/15 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2 text-xs text-palette-sage/90">
            <Zap className="h-3.5 w-3.5 text-palette-mint" />
            <span>&lt; 15ms Edge Redirects</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-palette-sage/90">
            <ShieldCheck className="h-3.5 w-3.5 text-palette-emerald" />
            <span>5-Day Auto-Purge Storage</span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs text-palette-sage/90">
            <QrCode className="h-3.5 w-3.5 text-palette-cream" />
            <span>Instant Dynamic QR Codes</span>
          </div>
        </div>
      </div>

      {/* Success Result Card */}
      {recentResult && (
        <div className="mt-5 p-5 rounded-xl bg-forest-900 border border-palette-emerald/40 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-palette-mint flex items-center space-x-1">
                <Flame className="h-3 w-3 text-palette-mint" />
                <span>Short URL Ready • {recentResult.expires_at ? 'Auto-deletes in 5 days' : 'Permanent'}</span>
              </span>
              <div className="text-base sm:text-lg font-mono font-bold text-white flex items-center space-x-2">
                <span className="text-palette-mint">{recentResult.shortUrl}</span>
              </div>
              <p className="text-xs text-palette-sage/80 truncate max-w-md">
                Original: {recentResult.original_url}
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => handleCopy(recentResult.shortUrl)}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all touch-manipulation ${
                  copied
                    ? 'bg-palette-emerald/20 text-palette-mint border border-palette-emerald/40'
                    : 'bg-palette-emerald text-forest-950 hover:bg-palette-mint shadow-sm'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => onOpenQr(recentResult.shortUrl, recentResult.short_code)}
                className="p-2.5 bg-forest-950 hover:bg-forest-800 text-palette-cream border border-palette-sage/25 rounded-lg transition-colors touch-manipulation"
                title="View QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>

              <a
                href={recentResult.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-forest-950 hover:bg-forest-800 text-palette-cream border border-palette-sage/25 rounded-lg transition-colors touch-manipulation"
                title="Test Redirect"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
