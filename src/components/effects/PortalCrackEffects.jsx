import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import PortalCrack from './PortalCrack';

/**
 * PortalCrackEffects - Complete effects pack for portal crack moment
 *
 * Includes:
 * - Center flash burst (white → purple fade)
 * - Shockwave ring (expanding circle)
 * - Crack pattern overlay
 * - Shard/spark particles
 * - Optional rune flare
 *
 * Animation Timing:
 * - T=0ms: Flash burst begins (80-150ms)
 * - T=50ms: Crack pattern draws (250-350ms)
 * - T=100ms: Shockwave expands (350-500ms)
 * - T=200ms: Particles spawn (500-900ms fade)
 * - T=650ms: All effects complete
 *
 * Usage:
 * ```jsx
 * const [isCracking, setIsCracking] = useState(false);
 *
 * const triggerCrack = () => {
 *   setIsCracking(true);
 * };
 *
 * <PortalCrackEffects
 *   isActive={isCracking}
 *   variant={3}
 *   showRunes={true}
 *   onComplete={() => {
 *     setIsCracking(false);
 *     console.log('Portal cracked!');
 *   }}
 * />
 * ```
 */

function ShockwaveRing({ delay = 0 }) {
    return (
        <motion.div
            className="absolute inset-0 rounded-full border-4 border-white/60"
            style={{
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.8), inset 0 0 20px rgba(168, 85, 247, 0.4)'
            }}
            initial={{
                scale: 0.5,
                opacity: 0,
                borderWidth: '8px'
            }}
            animate={{
                scale: [0.5, 1.8, 2.2],
                opacity: [0, 0.8, 0.4, 0],
                borderWidth: ['8px', '3px', '1px']
            }}
            transition={{
                duration: 0.5,
                delay,
                ease: 'easeOut'
            }}
        />
    );
}

ShockwaveRing.propTypes = {
    delay: PropTypes.number
};

function FlashBurst() {
    return (
        <>
            {/* Primary white flash */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.6) 30%, transparent 70%)',
                    filter: 'blur(5px)'
                }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{
                    opacity: [0, 1, 0.3, 0],
                    scale: [0.3, 0.8, 1.2, 1.5]
                }}
                transition={{
                    duration: 0.15,
                    times: [0, 0.3, 0.7, 1],
                    ease: 'easeOut'
                }}
            />

            {/* Secondary purple bloom */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.8) 0%, rgba(147, 51, 234, 0.4) 40%, transparent 70%)',
                    filter: 'blur(12px)'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                    opacity: [0, 0.6, 0.3, 0],
                    scale: [0.5, 1, 1.3, 1.6]
                }}
                transition={{
                    duration: 0.3,
                    delay: 0.05,
                    ease: 'easeOut'
                }}
            />

            {/* Screen flash overlay */}
            <motion.div
                className="absolute inset-[-50%]"
                style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, transparent 50%)',
                    filter: 'blur(20px)'
                }}
                initial={{ opacity: 0 }}
                animate={{
                    opacity: [0, 0.6, 0]
                }}
                transition={{
                    duration: 0.12,
                    ease: 'easeOut'
                }}
            />
        </>
    );
}

function SparkParticle({ angle, delay }) {
    const distance = 40 + Math.random() * 30; // 40-70% radius
    const endX = 50 + Math.cos(angle) * distance;
    const endY = 50 + Math.sin(angle) * distance;

    return (
        <motion.div
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
                left: '50%',
                top: '50%',
                boxShadow: '0 0 4px rgba(168, 85, 247, 0.8)'
            }}
            initial={{
                x: '0%',
                y: '0%',
                opacity: 0,
                scale: 0
            }}
            animate={{
                x: `${endX - 50}%`,
                y: `${endY - 50}%`,
                opacity: [0, 1, 0.6, 0],
                scale: [0, 1.5, 1, 0.5]
            }}
            transition={{
                duration: 0.7,
                delay: delay + 0.2,
                ease: 'easeOut'
            }}
        />
    );
}

SparkParticle.propTypes = {
    angle: PropTypes.number.isRequired,
    delay: PropTypes.number.isRequired
};

function RuneFlare({ position, delay }) {
    return (
        <motion.div
            className="absolute w-8 h-8 rounded-full"
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, transparent 70%)',
                filter: 'blur(3px)',
                transform: 'translate(-50%, -50%)'
            }}
            initial={{
                opacity: 0,
                scale: 0,
                rotate: 0
            }}
            animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0.8],
                rotate: [0, 180, 360]
            }}
            transition={{
                duration: 0.6,
                delay,
                ease: 'easeOut'
            }}
        />
    );
}

RuneFlare.propTypes = {
    position: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired
    }).isRequired,
    delay: PropTypes.number.isRequired
};

export default function PortalCrackEffects({
    isActive = false,
    variant = 1,
    showRunes = true,
    onComplete
}) {
    const [effectsComplete, setEffectsComplete] = useState(false);

    // Reset completion state when becoming active
    useEffect(() => {
        if (isActive) {
            setEffectsComplete(false);
            // Total animation duration: ~900ms
            const timer = setTimeout(() => {
                setEffectsComplete(true);
                if (onComplete) onComplete();
            }, 900);
            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    if (!isActive && !effectsComplete) return null;

    // Generate spark particles in circle around center
    const sparkCount = 16;
    const sparks = Array.from({ length: sparkCount }, (_, i) => ({
        angle: (i / sparkCount) * Math.PI * 2,
        delay: (i / sparkCount) * 0.1
    }));

    // Rune flare positions (cardinal + intercardinal points)
    const runePositions = [
        { x: 50, y: 10 },  // N
        { x: 85, y: 15 },  // NE
        { x: 90, y: 50 },  // E
        { x: 85, y: 85 },  // SE
        { x: 50, y: 90 },  // S
        { x: 15, y: 85 },  // SW
        { x: 10, y: 50 },  // W
        { x: 15, y: 15 }   // NW
    ];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <AnimatePresence>
                {isActive && (
                    <>
                        {/* Flash Burst (T=0ms, duration 80-150ms) */}
                        <FlashBurst />

                        {/* Crack Pattern (T=50ms, duration 250-350ms) */}
                        <PortalCrack
                            variant={variant}
                            isActive={true}
                            onComplete={() => console.log('Crack pattern complete')}
                        />

                        {/* Shockwave Rings (T=100ms, duration 350-500ms) */}
                        <ShockwaveRing delay={0.1} />
                        <ShockwaveRing delay={0.15} />
                        <ShockwaveRing delay={0.2} />

                        {/* Spark Particles (T=200ms, duration 500-900ms) */}
                        {sparks.map((spark, i) => (
                            <SparkParticle
                                key={`spark-${i}`}
                                angle={spark.angle}
                                delay={spark.delay}
                            />
                        ))}

                        {/* Rune Flares (optional) */}
                        {showRunes && runePositions.map((pos, i) => (
                            <RuneFlare
                                key={`rune-${i}`}
                                position={pos}
                                delay={0.15 + i * 0.03}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

PortalCrackEffects.propTypes = {
    isActive: PropTypes.bool,
    variant: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
    showRunes: PropTypes.bool,
    onComplete: PropTypes.func
};
