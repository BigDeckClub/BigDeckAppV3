/**
 * MysticOrb - Animated loading/reveal orb component
 * Replaces the loading bar in AI deck generation
 */

import React, { forwardRef, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import SparkParticles from '../effects/SparkParticles';
import GravityWarp from '../effects/GravityWarp';
import { getOrbState } from '../../ui/orb';
import './MysticOrb.css';

/**
 * Particle System for Portal Effect
 */
class PortalParticleSystem {
    // ... (unchanged)
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.width = canvas.width = canvas.offsetWidth;
        this.height = canvas.height = canvas.offsetHeight;
        this.isActive = false;

        window.addEventListener('resize', this.resize);
    }
    // ...
    // ... (Keep PortalParticleSystem class unchanged)
    // ...
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
    intensity = 0,
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

    // Derive Orb State from Intensity
    // We cycle "lands" based on intensity to simulate progression through the mana wheel
    const orbConfig = React.useMemo(() => getOrbState(intensity, intensity), [intensity]);
    const { land, intensity: intensityConfig } = orbConfig;

    // Dynamic Styles from Palette
    const dynamicStyle = {
        '--orb-bg-1': land.palette.core,
        '--orb-bg-2': land.palette.shadow,
        '--orb-bg-3': '#000000',
        '--cloud-1': land.palette.glow,
        '--cloud-2': land.palette.core,
        '--glass-glow': land.palette.glow,
        '--glass-border': land.palette.core,
        '--aura-color': land.palette.glow,
        '--lightning-1': land.palette.core,
        transform: `scale(${scale})`,
        transition: `transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1), --orb-bg-1 ${intensityConfig.transitionMs}ms ease`
    };

    return (
        <div className="orb-wrapper" style={dynamicStyle}>

            {/* The Main Orb Container */}
            <div
                ref={ref}
                className={`orb-container ${state} ${size} ${absorbing ? 'absorbing' : ''}`}
                onClick={handleClick}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
            >
                {/* --- NEW EFFECTS (Bottom Layer) --- */}

                {/* Gravity Warp - Cosmic distortion effect */}
                <GravityWarp intensity={absorbing ? 1 : intensityConfig.distortion} />

                {/* Spark Particles - Magic particle system */}
                <SparkParticles active={absorbing || state === 'ready'} density={intensityConfig.particleDensity} />

                {/* --- PORTAL LAYERS --- */}
                <div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none"
                    style={{
                        maskImage: "radial-gradient(circle, white 65%, transparent 100%)",
                        WebkitMaskImage: "radial-gradient(circle, white 65%, transparent 100%)"
                    }}
                >
                    {/* Energy Swirl */}
                    <motion.div
                        className="absolute inset-0 rounded-full blur-xl opacity-40"
                        style={{ background: `conic-gradient(from 0deg, #fff 0%, ${land.palette.core} 25%, ${land.palette.glow} 50%, #fff 75%)` }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12 / intensityConfig.pulseSpeed, repeat: Infinity, ease: "linear" }}
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                </div>

                {/* Environment Layers (Single Layer with CSS Variables now) */}
                <div className="orb-environment active" />

                <div className="orb-lightning" />
                <div className="orb-plasma" />

                {/* Pulse Ring */}
                <div className="orb-pulse-ring" />

                {/* Glass Shell */}
                <div className="orb-core active" />

                {/* Fog/Aura */}
                <div className="orb-fog-layer active" />

                {/* ... Keep Cracks Logic ... */}

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
    absorbing: PropTypes.bool,
    intensity: PropTypes.number
};

export default MysticOrb;
