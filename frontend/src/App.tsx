import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
  Link2,
  Sparkles,
  Layers,
  Shield,
  Zap,
  Info,
  Clock,
  Trash2,
  CheckCircle2,
  Terminal,
  HelpCircle,
  ChevronDown,
  Copy,
  Check,
  Globe,
  SlidersHorizontal,
  Share2,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ShortenCard } from './components/ShortenCard';
import { UrlCard } from './components/UrlCard';
import { QrModal } from './components/QrModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { AuthModal } from './components/AuthModal';
import { UrlItem, ShortenFormValues } from './types';
import { shortenUrl, fetchUserUrls, deleteUrl, API_BASE_URL } from './lib/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { copyToClipboard } from './lib/utils';

export const App: React.FC = () => {
  // 0. Detect if visitor landed on a short-link path (e.g., https://mini-url.pages.dev/OXr1QO)
  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+/, '') : '';
  const isShortCodePath =
    pathname.length > 0 &&
    !pathname.includes('.') &&
    !['api', 'auth', 'login', 'signup', 'dashboard'].includes(pathname.toLowerCase());

  useEffect(() => {
    if (isShortCodePath) {
      // Forward directly to backend redirect engine
      window.location.replace(`${API_BASE_URL}/${pathname}`);
    }
  }, [isShortCodePath, pathname]);

  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [links, setLinks] = useState<UrlItem[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Modal States
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [qrState, setQrState] = useState<{ isOpen: boolean; url: string; shortCode: string }>({
    isOpen: false,
    url: '',
    shortCode: '',
  });
  const [analyticsState, setAnalyticsState] = useState<{
    isOpen: boolean;
    shortCode: string | null;
  }>({
    isOpen: false,
    shortCode: null,
  });

  // 1. Listen for Supabase Authentication state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load links: When logged in, fetch from Supabase; for guests, load from localStorage
  useEffect(() => {
    if (user && authToken) {
      setIsLoadingLinks(true);
      fetchUserUrls(authToken)
        .then((userLinks) => {
          const normalized = userLinks.map((item) => ({
            ...item,
            shortUrl: `${window.location.origin}/${item.short_code}`,
          }));
          setLinks(normalized);
        })
        .catch((err) => console.error('Failed to load user links:', err))
        .finally(() => setIsLoadingLinks(false));
    } else {
      try {
        const saved = localStorage.getItem('mini_url_guest_links');
        if (saved) {
          const parsed = JSON.parse(saved);
          const normalized = (parsed || []).map((item: UrlItem) => ({
            ...item,
            shortUrl: `${window.location.origin}/${item.short_code}`,
          }));
          setLinks(normalized);
        }
      } catch {}
    }
  }, [user, authToken]);

  // Handle URL creation
  const handleShorten = async (values: ShortenFormValues): Promise<UrlItem> => {
    const res = await shortenUrl(values, authToken);

    // Always generate the clean, ultra-short link using the frontend domain
    const cleanShortUrl = `${window.location.origin}/${res.shortCode}`;

    const newItem: UrlItem = {
      id: Date.now(),
      short_code: res.shortCode,
      shortUrl: cleanShortUrl,
      original_url: res.originalUrl,
      title: res.title,
      clicks_count: 0,
      created_at: res.createdAt,
      expires_at: res.expiresAt,
      custom_alias: Boolean(values.customSlug),
    };

    setLinks((prev) => {
      const updated = [newItem, ...prev.filter((item) => item.short_code !== newItem.short_code)];
      if (!user) {
        localStorage.setItem('mini_url_guest_links', JSON.stringify(updated.slice(0, 20)));
      }
      return updated;
    });

    return newItem;
  };

  // Handle Delete
  const handleDelete = async (shortCode: string) => {
    if (user && authToken) {
      try {
        await deleteUrl(shortCode, authToken);
        setLinks((prev) => prev.filter((item) => item.short_code !== shortCode));
      } catch (err: any) {
        alert(err.message || 'Failed to delete URL');
      }
    } else {
      setLinks((prev) => {
        const updated = prev.filter((item) => item.short_code !== shortCode);
        localStorage.setItem('mini_url_guest_links', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCopyCurl = async () => {
    const curlCommand = `curl -X POST ${API_BASE_URL}/api/shorten \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/long-page", "expiresInDays": 5}'`;
    const success = await copyToClipboard(curlCommand);
    if (success) {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  // Immediate full-screen redirect view if visitor is clicking a short code
  if (isShortCodePath) {
    return (
      <div className="min-h-screen bg-[#060a07] text-[#BADBA2] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="h-10 w-10 border-3 border-palette-emerald/30 border-t-palette-emerald rounded-full animate-spin" />
          <h2 className="text-lg font-bold text-white">Redirecting you...</h2>
          <p className="text-xs text-palette-sage/80 font-mono">
            Forwarding via <span className="text-palette-mint">/{pathname}</span>
          </p>
        </div>
      </div>
    );
  }


  const totalUserClicks = links.reduce((acc, curr) => acc + (curr.clicks_count || 0), 0);

  const faqs = [
    {
      q: 'Why do conversation links default to 5-day expiration?',
      a: '90% of links shared in student chats, WhatsApp, and Discord are never clicked after 48 hours. Auto-purging links after 5 days preserves your free database space indefinitely so you never run out of storage.',
    },
    {
      q: 'Can I create permanent links that never expire?',
      a: 'Yes! Simply select "Permanent" in the lifespan selector. Permanent links remain active until you manually delete them from your dashboard.',
    },
    {
      q: 'How are my Google & Email credentials kept isolated from links?',
      a: 'Passwords and OAuth tokens are never stored in the database where links live. Supabase stores user identities in an internal, encrypted GoTrue vault protected by PostgreSQL Row-Level Security.',
    },
    {
      q: 'Why does Mini URL use HTTP 307 instead of HTTP 301?',
      a: 'Browsers permanently cache HTTP 301 redirects, bypassing your server on future clicks. Mini URL uses HTTP 307 Temporary Redirects to guarantee 100% accurate click analytics and geographic data on every visit.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-forest-950 text-white selection:bg-palette-emerald selection:text-forest-950 font-sans">
      {/* Navigation */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-12 sm:space-y-16">
        {/* Setup Helper Banner (Visible until Supabase credentials are plugged in) */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-xl bg-palette-cream/10 border border-palette-cream/25 text-palette-cream text-xs flex items-start space-x-3">
            <Info className="h-4 w-4 text-palette-mint flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Supabase Connection Ready</span>
              <span>
                Add your Supabase Project URL and Anon Key into <code className="bg-forest-900 px-1 py-0.5 rounded text-palette-mint font-mono">frontend/.env</code> to enable live database persistence.
              </span>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto px-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest-900 border border-palette-sage/20 text-xs text-palette-cream font-medium">
            <span className="h-2 w-2 rounded-full bg-palette-emerald animate-pulse" />
            <span>Ephemeral Link Engine • 5-Day Auto-Purge Default</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            <span className="flowing-water-text">
              Lightweight, Ephemeral Mini URLs
            </span>
          </h1>

          <p className="text-xs sm:text-base text-palette-sage/80 max-w-xl mx-auto leading-relaxed">
            Built for chats and conversations. Links auto-clean after 5 days to preserve zero database bloat, with sub-15ms edge redirects on Cloudflare.
          </p>
        </section>

        {/* Core Shortener Card */}
        <ShortenCard
          onShorten={handleShorten}
          onOpenQr={(url, shortCode) => setQrState({ isOpen: true, url, shortCode })}
        />

        {/* 1. Converted Links Section */}
        <section className="max-w-3xl mx-auto space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-palette-sage/15 pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <Layers className="h-4 w-4 text-palette-emerald" />
              <h2 className="text-base font-bold text-white">
                {user ? 'Your Converted Links Library' : 'Recently Converted Links'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-forest-900 text-palette-mint font-mono font-bold border border-palette-sage/20">
                {links.length}
              </span>
            </div>

            {user ? (
              <div className="flex items-center space-x-3 text-xs text-palette-sage/90">
                <span className="font-mono text-palette-cream font-bold">
                  {totalUserClicks.toLocaleString()} total clicks
                </span>
                <span className="text-palette-sage/40">•</span>
                <span className="text-[11px] text-palette-mint font-semibold">Cloud synced</span>
              </div>
            ) : (
              links.length > 0 && (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="text-xs text-palette-mint hover:text-palette-cream font-semibold transition-colors text-left sm:text-right touch-manipulation"
                >
                  Sign in or create account to sync all links →
                </button>
              )
            )}
          </div>

          {isLoadingLinks ? (
            <div className="py-12 text-center text-xs text-palette-sage/70 font-mono">
              Loading your converted links from database...
            </div>
          ) : links.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-palette-sage/20 p-8 space-y-2 bg-forest-900/30">
              <Link2 className="h-8 w-8 text-palette-sage/40 mx-auto" />
              <p className="text-sm font-bold text-palette-cream">No links converted yet</p>
              <p className="text-xs text-palette-sage/70">
                Paste any long web address above. It will default to 5-day auto-purge to keep your storage pristine!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((item) => (
                <UrlCard
                  key={item.short_code}
                  item={item}
                  canDelete={true}
                  onDelete={handleDelete}
                  onOpenQr={(url, shortCode) =>
                    setQrState({ isOpen: true, url, shortCode })
                  }
                  onOpenAnalytics={(shortCode) =>
                    setAnalyticsState({ isOpen: true, shortCode })
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* 2. Interactive "How It Works" 3-Step Process */}
        <section className="max-w-4xl mx-auto space-y-6 pt-4">
          <div className="text-center space-y-1">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-palette-mint">
              Workflow Overview
            </h3>
            <h2 className="text-2xl font-bold text-white">How Mini URL Works in 3 Steps</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-forest-900/60 border border-palette-sage/20 space-y-3 relative">
              <div className="h-9 w-9 rounded-xl bg-palette-emerald/15 text-palette-emerald flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h4 className="text-base font-bold text-white flex items-center space-x-1.5">
                <Link2 className="h-4 w-4 text-palette-mint" />
                <span>Paste & Customize</span>
              </h4>
              <p className="text-xs text-palette-sage/80 leading-relaxed">
                Paste your destination URL. Optionally add an internal title or custom alias slug (e.g. <code className="text-palette-cream font-mono">/my-alias</code>).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/60 border border-palette-sage/20 space-y-3 relative">
              <div className="h-9 w-9 rounded-xl bg-palette-mint/15 text-palette-mint flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h4 className="text-base font-bold text-white flex items-center space-x-1.5">
                <Clock className="h-4 w-4 text-palette-cream" />
                <span>Select Lifespan</span>
              </h4>
              <p className="text-xs text-palette-sage/80 leading-relaxed">
                Pick a 5-day lifespan to auto-purge dead links, 24 hours for quick chats, or keep it permanent.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/60 border border-palette-sage/20 space-y-3 relative">
              <div className="h-9 w-9 rounded-xl bg-palette-cream/15 text-palette-cream flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h4 className="text-base font-bold text-white flex items-center space-x-1.5">
                <Share2 className="h-4 w-4 text-palette-emerald" />
                <span>Share & Analyze</span>
              </h4>
              <p className="text-xs text-palette-sage/80 leading-relaxed">
                Copy your short link, download dynamic QR codes, and track real-time click analytics and locations.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Developer API Terminal Snippet */}
        <section className="max-w-4xl mx-auto space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-palette-sage/15 pb-2">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-palette-mint flex items-center space-x-1.5">
                <Terminal className="h-3.5 w-3.5" />
                <span>Developer REST API</span>
              </h3>
              <p className="text-sm font-bold text-white">Shorten URLs programmatically via terminal</p>
            </div>
            <button
              onClick={handleCopyCurl}
              className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest-900 border border-palette-sage/25 text-palette-cream hover:text-white transition-colors touch-manipulation cursor-pointer"
            >
              {copiedCurl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-palette-mint" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-palette-mint" />
                  <span>Copy cURL</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-forest-900 border border-palette-sage/25 font-mono text-xs text-palette-cream overflow-x-auto shadow-inner leading-relaxed">
            <span className="text-palette-sage/50 block mb-1"># Create short URL with 5-day expiration:</span>
            <span className="text-palette-mint">curl</span> -X POST {API_BASE_URL}/api/shorten \<br />
            &nbsp;&nbsp;-H <span className="text-palette-cream">"Content-Type: application/json"</span> \<br />
            &nbsp;&nbsp;-d <span className="text-palette-emerald">&#39;&#123;&quot;url&quot;: &quot;https://example.com/long-page&quot;, &quot;expiresInDays&quot;: 5&#125;&#39;</span>
          </div>
        </section>

        {/* 4. Frequently Asked Questions (FAQ) */}
        <section className="max-w-4xl mx-auto space-y-4 pt-4">
          <div className="text-center space-y-1">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-palette-mint">
              Got Questions?
            </h3>
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-forest-900/60 border border-palette-sage/20 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-palette-cream hover:text-white transition-colors touch-manipulation"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-palette-mint transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-palette-sage/80 leading-relaxed border-t border-palette-sage/10 pt-2 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. System Architecture Highlights */}
        <section className="border-t border-palette-sage/15 pt-12 max-w-4xl mx-auto">
          <h3 className="text-center text-xs uppercase font-extrabold tracking-widest text-palette-sage/60 mb-8">
            Engineered for Extreme Efficiency & Zero Maintenance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-forest-900/60 border border-palette-sage/20 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-palette-emerald/15 text-palette-mint flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-palette-cream">5-Day Auto-Purge</h4>
              <p className="text-xs text-palette-sage/80 leading-relaxed">
                Temporary conversation links expire automatically, freeing space so you never hit database limits.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-forest-900/60 border border-palette-sage/20 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-palette-mint/15 text-palette-emerald flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-palette-cream">Credential Isolation</h4>
              <p className="text-xs text-palette-sage/80 leading-relaxed">
                Google OAuth and cryptographic user auth are completely isolated from URLs with Row-Level Security.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-forest-900/60 border border-palette-sage/20 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-palette-cream/15 text-palette-cream flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-palette-cream">Sub-15ms Redirects</h4>
              <p className="text-xs text-palette-sage/80 leading-relaxed">
                Cloudflare V8 edge isolates execute global redirects near-instantly with non-blocking click tracking.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-palette-sage/15 bg-forest-950 py-8 text-center text-xs text-palette-sage/70">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-medium text-palette-cream">
            Mini URL • Created by{' '}
            <a
              href="https://github.com/theAbhijay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-palette-mint hover:underline font-bold"
            >
              Abhijay (@theAbhijay)
            </a>
          </p>
          <p className="text-[11px] text-palette-sage/60">
            Powered by React, Cloudflare Workers & Supabase.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <QrModal
        isOpen={qrState.isOpen}
        onClose={() => setQrState({ isOpen: false, url: '', shortCode: '' })}
        url={qrState.url}
        shortCode={qrState.shortCode}
      />

      <AnalyticsModal
        isOpen={analyticsState.isOpen}
        onClose={() => setAnalyticsState({ isOpen: false, shortCode: null })}
        shortCode={analyticsState.shortCode}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};
export default App;
