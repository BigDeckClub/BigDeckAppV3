import React, { useState } from 'react';
import { Mail, Github, Chrome, Apple, X as TwitterIcon } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Redirect to OAuth login - server handles everything and comes back to home
    window.location.href = '/api/login';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-2xl border border-slate-700/40 rounded-3xl p-8 max-w-md w-full shadow-2xl" style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.6) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          disabled={isLoading}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-black text-cyan-400">Sign In to BigDeck</h2>
          <p className="text-slate-400 text-sm">Choose your preferred authentication method</p>
        </div>

        {/* Sign-in methods */}
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            <Chrome className="w-5 h-5" />
            <span className="font-semibold flex-1 text-left">Sign in with Google</span>
            {isLoading && <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />}
          </button>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-400/50 hover:bg-slate-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            <Github className="w-5 h-5" />
            <span className="font-semibold flex-1 text-left">Sign in with GitHub</span>
            {isLoading && <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />}
          </button>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-400/50 hover:bg-slate-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            <TwitterIcon className="w-5 h-5" />
            <span className="font-semibold flex-1 text-left">Sign in with X</span>
            {isLoading && <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />}
          </button>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-400/50 hover:bg-slate-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            <Apple className="w-5 h-5" />
            <span className="font-semibold flex-1 text-left">Sign in with Apple</span>
            {isLoading && <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />}
          </button>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-teal-500/50 hover:bg-teal-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            <Mail className="w-5 h-5" />
            <span className="font-semibold flex-1 text-left">Sign in with Email</span>
            {isLoading && <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            🔒 Your data is secure and encrypted • Powered by Replit Auth
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
