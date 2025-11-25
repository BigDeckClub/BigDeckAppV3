import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';

const playChaChing = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  
  // Create a sequence of beeps for "cha ching" effect
  const frequencies = [659.25, 783.99, 523.25]; // E5, G5, C5
  const durations = [0.1, 0.1, 0.2];
  
  frequencies.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = freq;
    const startTime = now + durations.slice(0, index).reduce((a, b) => a + b, 0);
    const duration = durations[index];
    
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
};

export const FloatingDollarSigns = ({ show, onAnimationEnd }) => {
  const [dollarSigns, setDollarSigns] = useState([]);

  useEffect(() => {
    if (show) {
      playChaChing();
      
      // Create multiple dollar signs with random positions
      const signs = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: Math.random() * 80 + 10, // 10% to 90%
        delay: i * 0.05,
      }));
      
      setDollarSigns(signs);
      
      // Clear after animation completes
      const timer = setTimeout(() => {
        setDollarSigns([]);
        onAnimationEnd?.();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [show, onAnimationEnd]);

  if (dollarSigns.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {dollarSigns.map((sign) => (
        <div
          key={sign.id}
          className="absolute animate-float"
          style={{
            left: `${sign.left}%`,
            bottom: '-50px',
            animation: `float 1.5s ease-out forwards`,
            animationDelay: `${sign.delay}s`,
          }}
        >
          <DollarSign className="w-8 h-8 text-yellow-400 drop-shadow-lg" fill="currentColor" />
        </div>
      ))}
      
      <style>{`
        @keyframes float {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-300px) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
};
