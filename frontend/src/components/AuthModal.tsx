import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Link2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase credentials are not configured in frontend .env yet.');
      return;
    }

    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in encountered an issue.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsLoading(true);

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // When "Confirm email" is disabled in Supabase, session is granted immediately!
        if (data.session) {
          setSuccessMessage('Account created! Signed in successfully.');
          setTimeout(() => onClose(), 800);
        } else {
          setSuccessMessage('Account created! You can now sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-forest-900 border border-palette-sage/25 p-6 sm:p-8 shadow-2xl space-y-5">
        {/* Soft Ambient Organic Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-palette-mint/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-palette-emerald/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-palette-sage/70 hover:text-white hover:bg-forest-800 transition-colors touch-manipulation cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-gradient-to-tr from-palette-emerald via-palette-mint to-palette-cream shadow-md shadow-palette-emerald/20 mb-1">
            <Link2 className="h-5 w-5 text-forest-950 stroke-[2.6]" />
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {mode === 'signin' ? 'Sign In to Mini URL' : 'Create Free Account'}
          </h3>
          <p className="text-xs text-palette-sage/80 max-w-xs mx-auto">
            Access your full link library, edit links, and view click statistics.
          </p>
        </div>

        {/* 1. Primary Top Action: 1-Click Google Sign In */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-forest-950 bg-white hover:bg-slate-100 border border-slate-200 active:scale-[0.99] shadow-md transition-all flex items-center justify-center space-x-2.5 cursor-pointer touch-manipulation disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-forest-950" />
            ) : (
              <>
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-palette-sage/15"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-palette-sage/60">
            or continue with email
          </span>
          <div className="flex-grow border-t border-palette-sage/15"></div>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-forest-950 border border-palette-sage/15 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all touch-manipulation ${
              mode === 'signin'
                ? 'bg-palette-emerald text-forest-950 shadow-sm'
                : 'text-palette-sage/80 hover:text-palette-cream'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all touch-manipulation ${
              mode === 'signup'
                ? 'bg-palette-emerald text-forest-950 shadow-sm'
                : 'text-palette-sage/80 hover:text-palette-cream'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl text-xs bg-red-500/15 border border-red-500/30 text-red-300 flex items-start space-x-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="p-3 rounded-xl text-xs bg-palette-emerald/15 border border-palette-emerald/30 text-palette-cream flex items-start space-x-2 animate-in fade-in duration-150">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-palette-mint" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-medium text-palette-cream mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                required
                className="w-full pl-9 pr-3 py-2 bg-forest-950 border border-palette-sage/20 focus:border-palette-emerald focus:ring-1 focus:ring-palette-emerald rounded-xl text-base sm:text-xs text-white placeholder-palette-sage/50 outline-none transition-all touch-manipulation"
              />
              <Mail className="h-4 w-4 text-palette-sage/60 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-palette-cream mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2 bg-forest-950 border border-palette-sage/20 focus:border-palette-emerald focus:ring-1 focus:ring-palette-emerald rounded-xl text-base sm:text-xs text-white placeholder-palette-sage/50 outline-none transition-all touch-manipulation font-mono"
              />
              <Lock className="h-4 w-4 text-palette-sage/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-palette-sage/60 hover:text-palette-cream transition-colors touch-manipulation cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-medium text-palette-cream mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2 bg-forest-950 border border-palette-sage/20 focus:border-palette-emerald focus:ring-1 focus:ring-palette-emerald rounded-xl text-base sm:text-xs text-white placeholder-palette-sage/50 outline-none transition-all touch-manipulation font-mono"
                />
                <Lock className="h-4 w-4 text-palette-sage/60 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-forest-950 bg-gradient-to-r from-palette-emerald via-palette-mint to-palette-cream hover:opacity-95 active:scale-[0.99] shadow-md shadow-palette-emerald/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer touch-manipulation"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In with Email' : 'Instant Create Account'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="pt-2 border-t border-palette-sage/15 text-left flex items-start space-x-2 text-[11px] text-palette-sage/80">
          <ShieldCheck className="h-3.5 w-3.5 text-palette-mint flex-shrink-0 mt-0.5" />
          <span>
            Instant sign-in with zero email confirmation delays. Your credentials are securely isolated from shortened links.
          </span>
        </div>
      </div>
    </div>
  );
};
