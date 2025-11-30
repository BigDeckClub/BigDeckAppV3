import React, { useState } from 'react';
import { Layers, TrendingUp, BookOpen, BarChart3, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginForm({ onSuccess }) {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      setEmail('');
      setPassword('');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Layers,
      title: 'Inventory Tracking',
      description: 'Organize your entire MTG collection with event-sourced tracking'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Track spending, profit, and portfolio value in real-time'
    },
    {
      icon: BookOpen,
      title: 'Deck Management',
      description: 'Build, organize, and value your Magic decks'
    },
    {
      icon: TrendingUp,
      title: 'Sales History',
      description: 'Monitor sales and manage your selling transactions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex flex-col lg:flex-row items-stretch min-h-screen">
        {/* Left side - Features (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-b from-teal-950/40 to-slate-950 border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                <Layers className="w-6 h-6 text-slate-950 font-bold" />
              </div>
              <h1 className="text-4xl font-bold text-white">BigDeck</h1>
              <span className="text-2xl text-teal-400">.app</span>
            </div>
            <p className="text-slate-400 text-lg">Professional MTG Inventory Management</p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-teal-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-slate-500 text-sm">
            <p>🎴 Track. Analyze. Manage. Optimize.</p>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <div className="lg:hidden mb-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-slate-950" />
                </div>
                <h1 className="text-3xl font-bold text-white">BigDeck<span className="text-teal-400">.app</span></h1>
              </div>
              <p className="text-slate-400">Professional MTG Inventory Management</p>
            </div>

            {/* Auth Card */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-8 shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isSignup ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-slate-400">
                  {isSignup 
                    ? 'Start managing your MTG collection today' 
                    : 'Sign in to your inventory'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/50 transition"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/50 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 mt-6"
                >
                  {loading ? 'Loading...' : (
                    <>
                      {isSignup ? 'Create Account' : 'Sign In'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-teal-400 text-sm font-medium transition"
                >
                  {isSignup 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-slate-500 text-xs mt-6">
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
