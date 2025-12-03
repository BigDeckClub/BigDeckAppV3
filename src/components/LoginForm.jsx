import React, { useState, useEffect } from 'react';
import { Layers, TrendingUp, BookOpen, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Alert } from './ui';

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
          className="absolute rounded-full bg-gradient-to-br from-teal-400/60 to-cyan-500/40 blur-xl"
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
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
        .animate-slide-in { animation: slideInLeft 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}

// Feature card with animation
function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group"
      style={{ animationDelay: `${index * 0.1}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Card */}
      <div className="relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-teal-500/20 hover:bg-slate-800/60 transform hover:scale-105">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border border-teal-500/50 flex items-center justify-center transition-all duration-500 ${isHovered ? 'scale-110' : ''}`}>
            <Icon className="w-6 h-6 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold mb-1 group-hover:text-teal-300 transition-colors">{feature.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LoginForm - Authentication form with signup/login toggle
 * Refactored to use shared UI components
 */
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
      description: 'Organize your entire MTG collection with smart tracking'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Track spending, profit, and portfolio value in real-time'
    },
    {
      icon: BookOpen,
      title: 'Deck Management',
      description: 'Build, organize, and value your Magic decks effortlessly'
    },
    {
      icon: TrendingUp,
      title: 'Sales History',
      description: 'Monitor sales and manage your selling transactions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="fixed inset-0 opacity-15">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-500/40 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-cyan-500/40 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <AnimatedParticles />

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch min-h-screen">
        {/* Left side - Features (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-b from-teal-950/20 via-slate-900/30 to-slate-950 border-r border-slate-800/50 backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2 animate-fade-up">
              <div className="relative w-12 h-12">
                {/* Animated glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg blur-lg opacity-75 animate-pulse" />
                <div className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-slate-950 font-bold" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">BigDeck</h1>
                <span className="text-2xl text-transparent bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text">.app</span>
              </div>
            </div>
            <p className="text-slate-400 text-lg">Professional MTG Inventory Management</p>
          </div>

          {/* Features Grid */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-300 animate-shimmer">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Track. Analyze. Manage. Optimize.</span>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <div className="lg:hidden mb-8 text-center animate-fade-up">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg blur-lg opacity-75 animate-pulse" />
                  <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-slate-950" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white">BigDeck<span className="text-transparent bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text">.app</span></h1>
              </div>
              <p className="text-slate-400">Professional MTG Inventory Management</p>
            </div>

            {/* Auth Card */}
            <div className="relative group">
              {/* Card */}
              <div className="relative bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/60 hover:border-slate-600/80 p-8 shadow-xl transition-all duration-500 animate-fade-up hover:bg-slate-800/60" style={{ animationDelay: '0.1s' }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-white to-slate-300 bg-clip-text mb-2">
                    {isSignup ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-slate-400">
                    {isSignup 
                      ? 'Start managing your MTG collection today' 
                      : 'Sign in to your inventory'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="bg-slate-700/50 border-slate-600/50"
                    />
                  </div>

                  <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
                    <Input
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-slate-700/50 border-slate-600/50"
                    />
                  </div>

                  {error && (
                    <Alert variant="error" className="animate-fade-up">
                      {error}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    iconRight={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
                    className="mt-6 animate-fade-up shadow-lg hover:shadow-xl hover:shadow-teal-500/20"
                    style={{ animationDelay: '0.4s' }}
                  >
                    {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-700/50 text-center animate-fade-up" style={{ animationDelay: '0.5s' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(!isSignup);
                      setError('');
                    }}
                    className="text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 text-sm font-medium transition px-3 py-1 rounded-lg"
                  >
                    {isSignup 
                      ? 'Already have an account? Sign in' 
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-slate-500 text-xs mt-6 animate-fade-up" style={{ animationDelay: '0.6s' }}>
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
