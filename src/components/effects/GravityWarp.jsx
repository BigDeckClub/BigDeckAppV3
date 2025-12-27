import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * GravityWarp - Cosmic gravity distortion effect for portal
 *
 * Features:
 * - Simulates spacetime distortion near portal center
 * - Layered radial gradients with pulsing animations
 * - Subtle lens distortion effect
 * - Intensity-based scaling (0 = off, 1 = full power)
 *
 * Visual Style: Cosmic singularity
 * - Purple/blue gradient rings
 * - Pulsing scale + opacity
 * - Radial blur effect
 *
 * Performance: GPU-accelerated CSS transforms only
 */

export default function GravityWarp({ intensity = 0 }) {
    const isActive = intensity > 0;

    if (!isActive) return null;

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
            {/* Outer Distortion Ring */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(168, 85, 247, 0.15) 40%, transparent 70%)',
                    filter: 'blur(8px)'
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.4, 0.6, 0.4]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                initial={{ scale: 1, opacity: 0 }}
            />

            {/* Middle Gravity Field */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(34, 211, 238, 0.2) 30%, transparent 60%)',
                    filter: 'blur(12px)'
                }}
                animate={{
                    scale: [1.05, 0.95, 1.05],
                    opacity: [0.5, 0.7, 0.5],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                }}
                initial={{ scale: 1, opacity: 0 }}
            />

            {/* Inner Singularity Core */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.3) 0%, rgba(168, 85, 247, 0.15) 20%, transparent 40%)',
                    filter: 'blur(6px)'
                }}
                animate={{
                    scale: [0.9, 1.15, 0.9],
                    opacity: [0.6, 0.8, 0.6]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                initial={{ scale: 0.9, opacity: 0 }}
            />

            {/* Gravity Lens Distortion (subtle warping) */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `
                        radial-gradient(circle at 45% 45%, transparent 20%, rgba(255, 255, 255, 0.05) 25%, transparent 30%),
                        radial-gradient(circle at 55% 55%, transparent 20%, rgba(255, 255, 255, 0.05) 25%, transparent 30%)
                    `,
                    mixBlendMode: 'overlay',
                    filter: 'blur(4px)'
                }}
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.05, 1],
                    opacity: intensity * 0.6
                }}
                transition={{
                    rotate: {
                        duration: 8,
                        repeat: Infinity,
                        ease: 'linear'
                    },
                    scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    },
                    opacity: {
                        duration: 0.2
                    }
                }}
                initial={{ opacity: 0 }}
            />

            {/* Spacetime Grid (very subtle) */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `
                        repeating-conic-gradient(
                            from 0deg at center,
                            transparent 0deg,
                            rgba(168, 85, 247, 0.03) 30deg,
                            transparent 60deg
                        )
                    `,
                    mixBlendMode: 'screen'
                }}
                animate={{
                    rotate: [0, -360],
                    opacity: intensity * 0.4
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                    opacity: {
                        duration: 0.2
                    }
                }}
                initial={{ opacity: 0 }}
            />

            {/* Pulsing Event Horizon */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.4) 0%, transparent 15%)',
                    filter: 'blur(10px)'
                }}
                animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                initial={{ scale: 0.8, opacity: 0 }}
            />
        </div>
    );
}

GravityWarp.propTypes = {
    intensity: PropTypes.number
};
