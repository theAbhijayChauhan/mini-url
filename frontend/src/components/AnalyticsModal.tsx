import React, { useEffect, useState } from 'react';
import {
  X,
  BarChart2,
  MousePointerClick,
  Globe2,
  Smartphone,
  Compass,
  Calendar,
  Loader2,
} from 'lucide-react';
import { AnalyticsData } from '../types';
import { fetchAnalytics } from '../lib/api';
import { formatDate } from '../lib/utils';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortCode: string | null;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  shortCode,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !shortCode) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchAnalytics(shortCode)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load analytics.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, shortCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-forest-900 border border-palette-sage/25 p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-palette-sage/15 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart2 className="h-5 w-5 text-palette-emerald" />
              <h3 className="text-lg font-bold text-white">Edge Click Analytics</h3>
            </div>
            <p className="text-xs text-palette-mint font-mono mt-1">
              /{shortCode}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-palette-sage/70 hover:text-white hover:bg-forest-800 transition-colors touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-palette-mint animate-spin" />
            <p className="text-xs text-palette-sage">Aggregating edge click metrics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Data View */}
        {!isLoading && data && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-forest-950 border border-palette-sage/20 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-palette-sage">
                  <MousePointerClick className="h-3.5 w-3.5 text-palette-mint" />
                  <span>Total Clicks</span>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  {data.totalClicks.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-forest-950 border border-palette-sage/20 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-palette-sage">
                  <Calendar className="h-3.5 w-3.5 text-palette-cream" />
                  <span>Created Date</span>
                </div>
                <div className="text-lg font-bold text-palette-cream pt-1 font-mono">
                  {formatDate(data.url.createdAt)}
                </div>
              </div>
            </div>

            {/* Destination URL */}
            <div className="p-3.5 rounded-xl bg-forest-950/60 border border-palette-sage/20 text-xs text-slate-300">
              <span className="text-palette-sage/70 block text-[11px] mb-0.5">Target Destination:</span>
              <a
                href={data.url.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-palette-mint hover:underline break-all"
              >
                {data.url.originalUrl}
              </a>
            </div>

            {/* Split breakdown: Devices & Referrers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Devices */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-palette-cream uppercase tracking-wider">
                  <Smartphone className="h-3.5 w-3.5 text-palette-mint" />
                  <span>Device Breakdown</span>
                </div>

                {data.devices.length === 0 ? (
                  <p className="text-xs text-palette-sage/60">No device data yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.devices.map((d) => {
                      const percentage = data.totalClicks > 0
                        ? Math.round((d.count / data.totalClicks) * 100)
                        : 0;
                      return (
                        <div key={d.device} className="space-y-1">
                          <div className="flex justify-between text-xs text-palette-cream">
                            <span>{d.device}</span>
                            <span className="font-mono text-palette-sage">
                              {d.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-forest-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-palette-emerald rounded-full"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Referrers */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-palette-cream uppercase tracking-wider">
                  <Compass className="h-3.5 w-3.5 text-palette-mint" />
                  <span>Top Referrers</span>
                </div>

                {data.topReferrers.length === 0 ? (
                  <p className="text-xs text-palette-sage/60">No referrer data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.topReferrers.map((r) => (
                      <div
                        key={r.referrer}
                        className="flex items-center justify-between p-2 rounded-lg bg-forest-950 border border-palette-sage/20 text-xs"
                      >
                        <span className="text-palette-cream font-medium truncate max-w-[160px]">
                          {r.referrer}
                        </span>
                        <span className="font-mono text-palette-mint font-bold">
                          {r.count} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Countries */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-palette-cream uppercase tracking-wider">
                <Globe2 className="h-3.5 w-3.5 text-palette-emerald" />
                <span>Geographic Locations</span>
              </div>

              {data.topCountries.length === 0 ? (
                <p className="text-xs text-palette-sage/60">No country location data yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.topCountries.map((c) => (
                    <div
                      key={c.country}
                      className="px-3 py-1.5 rounded-lg bg-forest-950 border border-palette-sage/20 flex items-center space-x-2 text-xs"
                    >
                      <span className="font-semibold text-white">{c.country}</span>
                      <span className="font-mono text-palette-mint font-bold">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
