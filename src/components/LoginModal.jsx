import React, { useState } from 'react';
import { Mail, Chrome, Apple, Eye, EyeOff } from 'lucide-react';

// Facebook icon component (lucide-react doesn't have Facebook)
const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export const LoginModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState('');

  const handleOAuthLogin = (provider) => {
    setIsLoading(true);
    setLoadingProvider(provider);
    // Redirect to Auth.js provider signin
    window.location.href = `/api/auth/signin/${provider}`;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoadingProvider('email');

    try {
      if (isRegistering) {
        // Register new user
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailForm.email,
            password: emailForm.password,
            name: emailForm.name,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Registration failed');
        }

        // After registration, sign in
        window.location.href = `/api/auth/signin/credentials?email=${encodeURIComponent(emailForm.email)}`;
      } else {
        // Sign in with credentials
        window.location.href = `/api/auth/signin/credentials?email=${encodeURIComponent(emailForm.email)}`;
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const resetForm = () => {
    setShowEmailForm(false);
    setIsRegistering(false);
    setEmailForm({ email: '', password: '', name: '' });
    setError('');
    setShowPassword(false);
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
          onClick={() => { onClose(); resetForm(); }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          disabled={isLoading}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-black text-cyan-400">
            {showEmailForm ? (isRegistering ? 'Create Account' : 'Sign In with Email') : 'Sign In to BigDeck'}
          </h2>
          <p className="text-slate-400 text-sm">
            {showEmailForm 
              ? (isRegistering ? 'Create a new account with your email' : 'Enter your email and password')
              : 'Choose your preferred authentication method'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {showEmailForm ? (
          /* Email/Password Form */
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={emailForm.name}
                  onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={emailForm.password}
                  onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isLoading && loadingProvider === 'email' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-300"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          /* OAuth Provider Buttons */
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              <Chrome className="w-5 h-5" />
              <span className="font-semibold flex-1 text-left">Sign in with Google</span>
              {isLoading && loadingProvider === 'google' && (
                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              )}
            </button>

            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-400/50 hover:bg-slate-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              <Apple className="w-5 h-5" />
              <span className="font-semibold flex-1 text-left">Sign in with Apple</span>
              {isLoading && loadingProvider === 'apple' && (
                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              )}
            </button>

            <button
              onClick={() => handleOAuthLogin('facebook')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-blue-600/50 hover:bg-blue-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              <FacebookIcon className="w-5 h-5" />
              <span className="font-semibold flex-1 text-left">Sign in with Facebook</span>
              {isLoading && loadingProvider === 'facebook' && (
                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/60 text-slate-500">or</span>
              </div>
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-teal-500/50 hover:bg-teal-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              <Mail className="w-5 h-5" />
              <span className="font-semibold flex-1 text-left">Sign in with Email</span>
            </button>
          </div>
        )}

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
