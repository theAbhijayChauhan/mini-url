import React from 'react';
import { Link2, Github, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenAuth, onSignOut }) => {
  return (
    <header className="border-b border-palette-sage/15 bg-forest-950/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-palette-emerald via-palette-mint to-palette-cream flex items-center justify-center shadow-md shadow-palette-emerald/20">
            <Link2 className="h-5 w-5 text-forest-950 stroke-[2.6]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-white">
                Mini <span className="text-palette-mint">URL</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-palette-emerald/10 text-palette-emerald border border-palette-emerald/25">
                Edge v1.0
              </span>
            </div>
            <p className="text-[11px] text-palette-sage/80 hidden sm:block">
              Clean, ephemeral link engine with zero database bloat
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <a
            href="https://github.com/Chauhan"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-palette-cream/90 hover:text-white bg-forest-900 hover:bg-forest-800 border border-palette-sage/20 rounded-lg transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            <span>Open Source</span>
          </a>

          {user ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-forest-900 border border-palette-sage/20">
                <UserIcon className="h-3.5 w-3.5 text-palette-mint" />
                <span className="text-xs text-palette-cream font-medium max-w-[120px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-red-400 bg-forest-900 hover:bg-red-500/10 border border-palette-sage/20 hover:border-red-500/30 rounded-lg transition-colors touch-manipulation"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-forest-950 bg-gradient-to-r from-palette-emerald via-palette-mint to-palette-cream hover:opacity-95 rounded-lg shadow-sm shadow-palette-emerald/20 transition-all hover:scale-[1.02] active:scale-[0.98] touch-manipulation cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#1a202c"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#1a202c"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#1a202c"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#1a202c"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
