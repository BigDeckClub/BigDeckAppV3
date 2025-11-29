import React, { useState } from 'react';
import { LogIn, Zap, TrendingUp, Layers } from 'lucide-react';

export const LoginPage = () => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div style={{ background: '#0f172a' }} className="min-h-screen relative overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        {/* Header section */}
        <div className="w-full max-w-2xl space-y-12">
          {/* Logo and title */}
          <div className="text-center space-y-4">
            <div className="inline-block">
              <div className="text-6xl mb-2">🎴</div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-cyan-400">
              BigDeck.app
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium">
              Your Complete MTG Inventory Manager
            </p>
            <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
              Track cards, build decklists, and analyze your collection with real-time pricing
            </p>
          </div>

          {/* Features grid - Modern Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-lg border border-slate-700/30 hover:border-teal-500/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/20 hover:bg-slate-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-teal-500/20 rounded-lg">
                  <Layers className="w-5 h-5 text-teal-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 mb-1 text-sm">Inventory Tracking</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Organize all your cards with quantities and locations</p>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-lg border border-slate-700/30 hover:border-cyan-500/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:bg-slate-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-cyan-500/20 rounded-lg">
                  <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 mb-1 text-sm">Live Pricing</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Real-time TCG Player & Card Kingdom prices</p>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-lg border border-slate-700/30 hover:border-teal-500/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/20 hover:bg-slate-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-teal-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-teal-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 mb-1 text-sm">Sales Analytics</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Track profit, loss, and collection value</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign in card - Modern Premium Design */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/40 rounded-3xl p-8 md:p-10 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 space-y-6" style={{ 
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}>
              <div className="space-y-3">
                <p className="text-slate-300 text-center text-base font-medium">
                  Ready to take control of your collection?
                </p>
                <p className="text-slate-500 text-center text-sm">
                  Sign in with your preferred method to get started
                </p>
              </div>

              <button
                onClick={() => (window.location.href = '/api/login')}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="w-full py-4 px-6 font-bold flex items-center justify-center gap-3 text-lg rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 hover:from-cyan-400 hover:via-teal-400 hover:to-cyan-300 text-slate-900 shadow-2xl shadow-cyan-500/50 hover:shadow-3xl hover:shadow-cyan-500/70 uppercase font-black tracking-wide"
              >
                <LogIn className="w-6 h-6" />
                Sign In Now
              </button>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center font-medium uppercase tracking-wide">Sign in with</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                  <p className="text-xs text-slate-500">Google • GitHub • X • Apple • Email</p>
                  <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-xs">
              🔒 Your data is encrypted and never shared
            </p>
            <p className="text-slate-600 text-xs">
              Powered by Replit Auth • Built for Magic: The Gathering
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
