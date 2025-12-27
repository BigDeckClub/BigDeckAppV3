/**
 * MysticOrb - Animated loading/reveal orb component
 * Replaces the loading bar in AI deck generation
 */

import React, { forwardRef, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import SparkParticles from '../effects/SparkParticles';
import GravityWarp from '../effects/GravityWarp';
import './MysticOrb.css';

/**
 * Particle System for Portal Effect
 */
class PortalParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.width = canvas.width = canvas.offsetWidth;
        this.height = canvas.height = canvas.offsetHeight;
        this.isActive = false;

        window.addEventListener('resize', this.resize);
    }

    resize = () => {
        if (!this.canvas) return;
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
    }

    emit(count = 20) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: Math.random() > 0.5 ? '#a855f7' : '#22d3ee', // Purple or Cyan
                size: Math.random() * 2 + 1
            });
        }

        if (!this.isActive) {
            this.isActive = true;
            this.animate();
        }
    }

    animate = () => {
        if (!this.isActive) return;
        if (this.particles.length === 0) {
            this.isActive = false;
            this.ctx.clearRect(0, 0, this.width, this.height);
            return;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Update and Draw
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Physics: Particles shoot out then suck back in/fade
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95; // Friction
            p.vy *= 0.95;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;
        requestAnimationFrame(this.animate);
    }

    destroy() {
        window.removeEventListener('resize', this.resize);
        this.isActive = false;
    }
}

/**
 * MysticOrb Component
 */
const MysticOrb = forwardRef(({
    state = 'loading',
    loadingText = 'Gathering energy...',
    loadingIcon = '🔮',
    size = 'medium',
    scale = 1.0,
    onClick,
    onCrackComplete,
    absorbing = false
}, ref) => {
    const canvasRef = useRef(null);
    const particleSystemRef = useRef(null);

    // Initialize particle system
    useEffect(() => {
        if (canvasRef.current) {
            particleSystemRef.current = new PortalParticleSystem(canvasRef.current);
        }
        return () => {
            if (particleSystemRef.current) particleSystemRef.current.destroy();
        };
    }, []);

    // Trigger particles on absorb
    useEffect(() => {
        if (absorbing && particleSystemRef.current) {
            // Burst of particles
            particleSystemRef.current.emit(30);
        }
    }, [absorbing]);

    const handleClick = (e) => {
        if (onClick) onClick(e);
    };

    React.useEffect(() => {
        if (state === 'cracking' && onCrackComplete) {
            const timer = setTimeout(() => onCrackComplete(), 1500);
            return () => clearTimeout(timer);
        }
    }, [state, onCrackComplete]);

    const isClickable = state === 'ready' || !!onClick;

    // Cycle themes
    const [currentIdentity, setCurrentIdentity] = React.useState('blue');
    const colors = ['white', 'blue', 'black', 'red', 'green'];
    React.useEffect(() => {
        if (state !== 'loading' && state !== 'idle') return;
        const interval = setInterval(() => {
            setCurrentIdentity(prev => {
                const currentIndex = colors.indexOf(prev);
                return colors[(currentIndex + 1) % colors.length];
            });
        }, 6000);
        return () => clearInterval(interval);
    }, [state]);

    return (
        <div className="orb-wrapper" style={{ transform: `scale(${scale})`, transition: 'transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>

            {/* The Main Orb Container */}
            <div
                ref={ref}
                className={`orb-container ${state} ${size} ${currentIdentity} ${absorbing ? 'absorbing' : ''}`}
                onClick={handleClick}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
            >
                {/* --- NEW EFFECTS (Bottom Layer) --- */}

                {/* Gravity Warp - Cosmic distortion effect (z-index: 5) */}
                <GravityWarp intensity={absorbing ? 1 : 0} />

                {/* Spark Particles - Magic particle system (z-index: 10) */}
                <SparkParticles active={absorbing} />

                {/* --- PORTAL LAYERS --- */}

                {/*
                    PORTAL MASKING LAYER
                    This handles the "hole" and overflow-masking for the portal effect.
                    It sits inside the container but can mask content.
                 */}
                <div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none"
                    style={{
                        maskImage: "radial-gradient(circle, white 65%, transparent 100%)",
                        WebkitMaskImage: "radial-gradient(circle, white 65%, transparent 100%)"
                    }}
                >
                    {/* Energy Swirl - User Spec */}
                    <motion.div
                        className="absolute inset-0 rounded-full blur-xl opacity-40"
                        style={{ background: "conic-gradient(from 0deg, #fff 0%, #a855f7 25%, #60a5fa 50%, #fff 75%)" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Old Particle Canvas (can be removed later if new SparkParticles replaces it) */}
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                </div>

                {/* --- Existing Layers --- */}

                {/* Environment Layers */}
                {colors.map((color) => (
                    <div
                        key={color}
                        className={`orb-environment ${color} ${currentIdentity === color ? 'active' : ''}`}
                    />
                ))}

                <div className="orb-lightning" />
                <div className="orb-plasma" />

                {/* Pulse Ring for Absorption */}
                <div className="orb-pulse-ring" />

                {/* Glass Shell */}
                {colors.map((color) => (
                    <div
                        key={`core-${color}`}
                        className={`orb-core ${color} ${currentIdentity === color ? 'active' : ''}`}
                    />
                ))}

                {/* Fog/Aura */}
                {colors.map((color) => (
                    <div
                        key={`fog-${color}`}
                        className={`orb-fog-layer ${color} ${currentIdentity === color ? 'active' : ''}`}
                    />
                ))}

                {/* Cracks Layer */}
                <div className="orb-cracks">
                    <svg viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                        <path pathLength="1" d="M50 50 L50 20 L52 15 M50 50 L80 50 L85 52 M50 50 L50 80 L48 85 M50 50 L20 50 L15 48" className="crack-main" />
                        <path pathLength="1" d="M50 50 L70 30 L75 25 M50 50 L30 70 L25 75 M50 50 L30 30 L25 25 M50 50 L70 70 L75 75" className="crack-main" />
                        <path pathLength="1" d="M50 40 L55 35 L60 40 M40 50 L35 55 L40 60" opacity="0.7" className="crack-detail" />
                        <path pathLength="1" d="M60 60 L65 55 M35 35 L30 40" opacity="0.7" className="crack-detail" />
                        <circle cx="50" cy="50" r="15" fill="white" fillOpacity="0.1" stroke="none" className="crack-center" />
                    </svg>
                </div>

                <div className="orb-particles" />
            </div>

            <div className={`orb-text ${state}`}>
                {state === 'loading' && (
                    <>
                        <span className="orb-loading-icon">{loadingIcon}</span>
                        <span style={{ marginLeft: '0.5rem' }}>{loadingText}</span>
                    </>
                )}
                {state === 'ready' && '✨ Click to Reveal Your Deck ✨'}
                {state === 'cracking' && ''}
            </div>
        </div >
    );
});

MysticOrb.displayName = 'MysticOrb';

MysticOrb.propTypes = {
    state: PropTypes.oneOf(['loading', 'ready', 'cracking', 'idle']),
    loadingText: PropTypes.string,
    loadingIcon: PropTypes.string,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    scale: PropTypes.number,
    onClick: PropTypes.func,
    onCrackComplete: PropTypes.func,
    absorbing: PropTypes.bool
};

export default MysticOrb;
