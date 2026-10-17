import React, { useState } from 'react';
import {
  Copy,
  Check,
  QrCode,
  BarChart3,
  ExternalLink,
  Trash2,
  Calendar,
  MousePointerClick,
  Clock,
  Sparkles,
} from 'lucide-react';
import { UrlItem } from '../types';
import { copyToClipboard, formatDate, truncate } from '../lib/utils';

interface UrlCardProps {
  item: UrlItem;
  canDelete: boolean;
  onDelete: (shortCode: string) => void;
  onOpenQr: (url: string, shortCode: string) => void;
  onOpenAnalytics: (shortCode: string) => void;
}

export const UrlCard: React.FC<UrlCardProps> = ({
  item,
  canDelete,
  onDelete,
  onOpenQr,
  onOpenAnalytics,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(item.shortUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate days remaining if expires_at is present
  const getExpirationBadge = () => {
    if (!item.expires_at) {
      return (
        <span className="flex items-center space-x-1 text-palette-cream/90 bg-forest-950 px-2 py-0.5 rounded-full border border-palette-sage/20 text-[10px] font-semibold">
          <Sparkles className="h-2.5 w-2.5 text-palette-mint" />
          <span>Permanent</span>
        </span>
      );
    }

    const exp = new Date(item.expires_at).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="flex items-center space-x-1 text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full border border-red-500/20 text-[10px] font-semibold">
          <span>Expired</span>
        </span>
      );
    }

    return (
      <span className="flex items-center space-x-1 text-palette-mint bg-palette-emerald/10 px-2 py-0.5 rounded-full border border-palette-emerald/25 text-[10px] font-semibold">
        <Clock className="h-2.5 w-2.5" />
        <span>Auto-purges in {diffDays}d</span>
      </span>
    );
  };

  return (
    <div className="group rounded-xl bg-forest-900/80 hover:bg-forest-900 border border-palette-sage/20 hover:border-palette-emerald/40 p-4 sm:p-5 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* URL Information */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="font-mono font-bold text-palette-mint text-sm sm:text-base hover:underline cursor-pointer">
              <a href={item.shortUrl} target="_blank" rel="noopener noreferrer">
                {item.shortUrl}
              </a>
            </span>

            {getExpirationBadge()}

            {item.custom_alias && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-palette-cream/10 text-palette-cream border border-palette-cream/20">
                Custom Alias
              </span>
            )}

            {item.title && (
              <span className="text-xs text-palette-sage font-medium truncate max-w-[200px]">
                • {item.title}
              </span>
            )}
          </div>

          <p className="text-xs text-palette-sage/80 truncate max-w-xl font-sans" title={item.original_url}>
            {truncate(item.original_url, 65)}
          </p>

          <div className="flex items-center space-x-4 text-[11px] text-palette-sage/70 pt-1 font-mono">
            <span className="flex items-center space-x-1">
              <Calendar className="h-3 w-3 text-palette-sage/60" />
              <span>Created {formatDate(item.created_at)}</span>
            </span>

            <span className="flex items-center space-x-1 font-bold text-white">
              <MousePointerClick className="h-3 w-3 text-palette-emerald" />
              <span>{item.clicks_count.toLocaleString()} clicks</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 pt-2.5 sm:pt-0 border-t sm:border-0 border-palette-sage/15 w-full sm:w-auto justify-end">
          <button
            onClick={handleCopy}
            className={`p-2.5 sm:p-2 rounded-lg text-xs font-semibold border transition-colors touch-manipulation ${
              copied
                ? 'bg-palette-emerald/20 text-palette-mint border-palette-emerald/40'
                : 'bg-forest-950 hover:bg-forest-800 text-palette-cream border-palette-sage/20'
            }`}
            title="Copy Short URL"
          >
            {copied ? <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          </button>

          <button
            onClick={() => onOpenQr(item.shortUrl, item.short_code)}
            className="p-2.5 sm:p-2 bg-forest-950 hover:bg-forest-800 text-palette-cream border border-palette-sage/20 rounded-lg transition-colors touch-manipulation"
            title="Download QR Code"
          >
            <QrCode className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>

          <button
            onClick={() => onOpenAnalytics(item.short_code)}
            className="flex items-center space-x-1 px-3 py-2 sm:px-2.5 sm:py-1.5 bg-forest-950 hover:bg-forest-800 text-palette-mint border border-palette-sage/20 rounded-lg text-xs font-bold transition-colors touch-manipulation"
            title="View Analytics"
          >
            <BarChart3 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-palette-emerald" />
            <span>Stats</span>
          </button>

          <a
            href={item.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 sm:p-2 bg-forest-950 hover:bg-forest-800 text-palette-cream border border-palette-sage/20 rounded-lg transition-colors touch-manipulation"
            title="Visit link"
          >
            <ExternalLink className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </a>

          {canDelete && (
            <button
              onClick={() => onDelete(item.short_code)}
              className="p-2.5 sm:p-2 bg-forest-950 hover:bg-red-500/20 text-palette-sage/60 hover:text-red-400 border border-palette-sage/20 hover:border-red-500/30 rounded-lg transition-colors touch-manipulation"
              title="Delete URL"
            >
              <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
