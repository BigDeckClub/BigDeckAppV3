import React, { useState } from 'react';
import { Mail, Github, Chrome, Apple, X as TwitterIcon } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProceed = () => {
    setIsLoading(true);
    // Open Replit login in a popup window instead of full page redirect
    const width = 500;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    
    const popup = window.open(
      '/api/login',
      'replitLogin',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );
    
    // Poll for redirect/success
    if (popup) {
      const checkInterval = setInterval(() => {
        try {
          // Check if popup was closed or redirected
          if (popup.closed) {
            clearInterval(checkInterval);
            // Verify if user is now authenticated
            fetch('/api/auth/user')
              .then(res => {
                if (res.ok) {
                  // User is authenticated, redirect
                  window.location.href = '/';
                } else {
                  setIsLoading(false);
                }
              })
              .catch(() => setIsLoading(false));
          }
        } catch (e) {
          // Ignore cross-origin errors
        }
      }, 500);
      
      // Auto-close checking after 5 minutes
      setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
    } else {
      // Popup blocked, fallback to redirect
      setIsLoading(false);
      window.location.href = '/api/login';
    }
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
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-black text-cyan-400">Welcome to BigDeck</h2>
          <p className="text-slate-400 text-sm">Choose your preferred sign-in method</p>
        </div>

        {/* Sign-in methods */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => setSelectedMethod('google')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
              selectedMethod === 'google'
                ? 'bg-blue-500/20 border-blue-500/60 text-blue-100'
                : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
            }`}
          >
            <Chrome className="w-5 h-5" />
            <span className="font-semibold">Sign in with Google</span>
          </button>

          <button
            onClick={() => setSelectedMethod('github')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
              selectedMethod === 'github'
                ? 'bg-slate-400/20 border-slate-300/60 text-slate-100'
                : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
            }`}
          >
            <Github className="w-5 h-5" />
            <span className="font-semibold">Sign in with GitHub</span>
          </button>

          <button
            onClick={() => setSelectedMethod('x')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
              selectedMethod === 'x'
                ? 'bg-slate-600/20 border-slate-400/60 text-slate-100'
                : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
            }`}
          >
            <TwitterIcon className="w-5 h-5" />
            <span className="font-semibold">Sign in with X</span>
          </button>

          <button
            onClick={() => setSelectedMethod('apple')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
              selectedMethod === 'apple'
                ? 'bg-slate-200/20 border-slate-200/60 text-slate-100'
                : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
            }`}
          >
            <Apple className="w-5 h-5" />
            <span className="font-semibold">Sign in with Apple</span>
          </button>

          <button
            onClick={() => setSelectedMethod('email')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
              selectedMethod === 'email'
                ? 'bg-teal-500/20 border-teal-500/60 text-teal-100'
                : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="font-semibold">Sign in with Email</span>
          </button>
        </div>

        {/* Email input (shown when email is selected) */}
        {selectedMethod === 'email' && (
          <div className="mb-8 animate-fade-in">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20 transition-all duration-200"
            />
          </div>
        )}

        {/* Proceed button */}
        <button
          onClick={handleProceed}
          disabled={selectedMethod === 'email' && !email}
          className="w-full py-3 px-4 font-bold flex items-center justify-center gap-2 rounded-xl transition-all duration-200 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-900 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Proceed to Login
            </>
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            🔒 Your data is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
