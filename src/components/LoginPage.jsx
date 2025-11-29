import React from 'react';
import { LogIn } from 'lucide-react';

export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-teal-400 mb-2">BigDeck.app</h1>
          <p className="text-slate-400 text-lg">MTG Card Inventory Manager</p>
        </div>

        <div className="card p-8 space-y-6">
          <p className="text-slate-300 text-center">
            Sign in to manage your MTG card collection, create decklists, and track sales.
          </p>

          <button
            onClick={() => (window.location.href = '/api/login')}
            className="w-full btn-primary py-3 font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </button>

          <p className="text-xs text-slate-500 text-center">
            Sign in with Google, GitHub, X, Apple, or email/password
          </p>
        </div>

        <div className="mt-12 space-y-4 text-slate-400 text-sm">
          <div className="flex gap-3">
            <div className="text-teal-400 font-bold">📦</div>
            <p>Track your complete MTG card inventory with quantities and locations</p>
          </div>
          <div className="flex gap-3">
            <div className="text-teal-400 font-bold">🎴</div>
            <p>Create and manage decklists with real-time pricing</p>
          </div>
          <div className="flex gap-3">
            <div className="text-teal-400 font-bold">💰</div>
            <p>Track sales, profit, and loss on container sales</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
