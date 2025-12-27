import React, { useState, useEffect } from 'react';
import { Layers, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AIDeckBuilder from './aidbuilder/AIDeckBuilder';
import ThemeToggle from './ui/ThemeToggle';

// Animated background particles
function AnimatedParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const generateParticles = () => {
      return Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 2,
        size: 2 + Math.random() * 4,
      }));
    };
    setParticles(generateParticles());
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-[var(--bda-primary)]/60 to-[var(--bda-secondary)]/40 blur-xl"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `float ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
          50% { transform: translate(${(Math.random() - 0.5) * 100}px, ${(Math.random() - 0.5) * 100}px) scale(1.2); opacity: 0.6; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeInUp 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}

/**
 * LoginForm - Guest Mode Deck Builder wrapper
 */
export function LoginForm({ onSuccess }) {
  return (
    <div className="min-h-screen bg-[var(--bda-bg)] relative overflow-hidden transition-colors duration-300 flex flex-col items-center justify-center">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle className="bg-[var(--surface)]/50 backdrop-blur-md border border-[var(--border)] shadow-sm" />
      </div>

      {/* Subtle animated background */}
      <div className="fixed inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[var(--bda-primary)]/40 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[var(--bda-secondary)]/40 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <AnimatedParticles />

      {/* Guest Mode Deck Builder */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center animate-fade-up pt-10 pb-20">
        <AIDeckBuilder
          key="guest-builder"
          isGuest={true}
          onAuthSuccess={onSuccess}
        />
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[var(--text-muted)] text-sm opacity-30 pointer-events-none z-0">
        <p className="text-[10px] font-mono">BigDeck.app // Omni-Mind v3.0</p>
      </div>

    </div>
  );
}
