import React, { useState } from 'react';
import { LogIn, Zap, TrendingUp, Layers } from 'lucide-react';

export const LoginPage = () => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-slate-800 rounded-full mix-blend-screen filter blur-3xl opacity-5"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        {/* Header section */}
        <div className="w-full max-w-2xl space-y-12">
          {/* Logo and title */}
          <div className="text-center space-y-4">
            <div className="inline-block">
              <div className="text-6xl mb-2">🎴</div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent animate-fade-in">
              BigDeck.app
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium">
              Your Complete MTG Inventory Manager
            </p>
            <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
              Track cards, build decklists, and analyze your collection with real-time pricing
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/20">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-teal-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-200 mb-1 text-sm">Inventory Tracking</h3>
                  <p className="text-slate-400 text-xs">Organize all your cards with quantities and locations</p>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-200 mb-1 text-sm">Live Pricing</h3>
                  <p className="text-slate-400 text-xs">Real-time TCG Player & Card Kingdom prices</p>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/20">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-teal-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-200 mb-1 text-sm">Sales Analytics</h3>
                  <p className="text-slate-400 text-xs">Track profit, loss, and collection value</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign in card */}
          <div className="relative">
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ opacity: isHovering ? 1 : 0 }}></div>

            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 md:p-10 shadow-2xl space-y-6">
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
                className="w-full py-4 px-6 font-bold flex items-center justify-center gap-3 text-lg rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 hover:from-cyan-400 hover:via-teal-400 hover:to-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/60"
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
