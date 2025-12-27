import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * PortalCrack - Magical fracture overlay for portal break animation
 *
 * Features:
 * - 6 unique radial fracture patterns
 * - Arcane rune-like jagged lines
 * - Animated stroke drawing (stroke-dasharray)
 * - Bloom flash effect
 * - Fade out after completion
 *
 * Usage:
 * ```jsx
 * <PortalCrack
 *   variant={1-6}
 *   isActive={true}
 *   onComplete={() => console.log('crack animation done')}
 * />
 * ```
 *
 * Animation Sequence:
 * 1. T=0ms: Cracks draw outward from center (250-350ms)
 * 2. T=150ms: Bloom flash at center (80-150ms)
 * 3. T=350ms: Hold complete pattern (100ms)
 * 4. T=450ms: Fade out (200ms)
 * Total: ~650ms
 */

// SVG crack patterns - radial fractures from center
const CRACK_PATTERNS = {
    1: {
        // Cardinal directions + diagonals (8-point star fracture)
        paths: [
            // Main radial cracks
            "M50 50 L50 5 L48 0 M50 50 L95 50 L100 52", // N, E
            "M50 50 L50 95 L52 100 M50 50 L5 50 L0 48", // S, W
            "M50 50 L85 15 L90 10 M50 50 L15 85 L10 90", // NE, SW
            "M50 50 L15 15 L10 10 M50 50 L85 85 L90 90", // NW, SE
            // Detail cracks (branching)
            "M50 25 L55 15 L60 12 M75 50 L85 55 L88 58",
            "M50 75 L45 85 L42 88 M25 50 L15 45 L12 42"
        ],
        runes: [
            // Runic symbols at cardinal points
            { path: "M50 10 L48 12 L52 12 Z", cx: 50, cy: 10 },
            { path: "M90 50 L88 48 L88 52 Z", cx: 90, cy: 50 },
            { path: "M50 90 L48 88 L52 88 Z", cx: 50, cy: 90 },
            { path: "M10 50 L12 48 L12 52 Z", cx: 10, cy: 50 }
        ]
    },
    2: {
        // Spiral fracture pattern
        paths: [
            "M50 50 L70 30 L85 25 L95 20",
            "M50 50 L70 70 L85 75 L95 80",
            "M50 50 L30 70 L15 75 L5 80",
            "M50 50 L30 30 L15 25 L5 20",
            // Spiral connectors
            "M70 30 L75 45 M70 70 L60 75",
            "M30 70 L25 55 M30 30 L40 25",
            // Inner ring
            "M50 35 A15 15 0 1 1 50 65 A15 15 0 1 1 50 35"
        ],
        runes: [
            { path: "M85 25 L83 27 M85 25 L87 27", cx: 85, cy: 25 },
            { path: "M85 75 L87 73 M85 75 L83 73", cx: 85, cy: 75 }
        ]
    },
    3: {
        // Lightning bolt fracture
        paths: [
            "M50 50 L55 20 L50 15 L58 0",
            "M50 50 L80 55 L85 50 L100 58",
            "M50 50 L45 80 L50 85 L42 100",
            "M50 50 L20 45 L15 50 L0 42",
            // Zigzag branches
            "M55 20 L65 25 L63 30",
            "M80 55 L85 65 L88 63",
            "M45 80 L35 75 L37 70",
            "M20 45 L15 35 L12 37"
        ],
        runes: [
            { path: "M58 5 L56 7 L60 7 L58 9 Z", cx: 58, cy: 5 },
            { path: "M95 58 L97 56 L97 60 L99 58 Z", cx: 95, cy: 58 }
        ]
    },
    4: {
        // Shattered glass pattern
        paths: [
            "M50 50 L60 30 L75 20",
            "M50 50 L70 60 L85 75",
            "M50 50 L40 70 L25 80",
            "M50 50 L30 40 L15 25",
            "M50 50 L55 55 L65 50",
            "M50 50 L45 45 L35 50",
            // Connecting fragments
            "M60 30 L65 35 M70 60 L75 65",
            "M40 70 L35 65 M30 40 L25 35",
            // Outer shards
            "M75 20 L80 15 L82 18",
            "M85 75 L90 80 L88 82",
            "M25 80 L20 85 L18 82",
            "M15 25 L10 20 L12 18"
        ],
        runes: []
    },
    5: {
        // Arcane circle breach
        paths: [
            // Outer circle breaks
            "M50 10 A40 40 0 0 1 90 50 M90 50 L95 50",
            "M90 50 A40 40 0 0 1 50 90 M50 90 L50 95",
            "M50 90 A40 40 0 0 1 10 50 M10 50 L5 50",
            "M10 50 A40 40 0 0 1 50 10 M50 10 L50 5",
            // Radial breaks through circle
            "M50 50 L50 10 M50 50 L90 50",
            "M50 50 L50 90 M50 50 L10 50",
            // Inner circle
            "M50 35 A15 15 0 1 1 50 65 A15 15 0 1 1 50 35"
        ],
        runes: [
            { path: "M50 5 L48 8 L52 8 L50 11 L48 8 Z", cx: 50, cy: 5 },
            { path: "M95 50 L92 48 L92 52 L89 50 L92 48 Z", cx: 95, cy: 50 },
            { path: "M50 95 L48 92 L52 92 L50 89 L48 92 Z", cx: 50, cy: 95 },
            { path: "M5 50 L8 48 L8 52 L11 50 L8 48 Z", cx: 5, cy: 50 }
        ]
    },
    6: {
        // Organic crack (tree-like branching)
        paths: [
            "M50 50 L50 25 M50 25 L45 15 M50 25 L55 15",
            "M50 50 L75 50 M75 50 L85 45 M75 50 L85 55",
            "M50 50 L50 75 M50 75 L45 85 M50 75 L55 85",
            "M50 50 L25 50 M25 50 L15 45 M25 50 L15 55",
            // Secondary branches
            "M45 15 L42 8 M45 15 L48 8",
            "M85 45 L92 42 M85 55 L92 58",
            "M45 85 L42 92 M55 85 L58 92",
            "M15 45 L8 42 M15 55 L8 58"
        ],
        runes: [
            { path: "M50 8 L48 10 L50 12 L52 10 Z", cx: 50, cy: 8 },
            { path: "M92 50 L90 48 L88 50 L90 52 Z", cx: 92, cy: 50 }
        ]
    }
};

export default function PortalCrack({ variant = 1, isActive = false, onComplete }) {
    const pattern = CRACK_PATTERNS[variant] || CRACK_PATTERNS[1];

    if (!isActive) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-30">
            {/* Bloom Flash */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0%, rgba(168, 85, 247, 0.6) 20%, transparent 50%)',
                    filter: 'blur(8px)'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                    opacity: [0, 1, 0.6, 0],
                    scale: [0.5, 1.2, 1, 1]
                }}
                transition={{
                    duration: 0.15,
                    times: [0, 0.5, 0.7, 1],
                    delay: 0.15,
                    ease: 'easeOut'
                }}
            />

            {/* SVG Crack Pattern */}
            <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                style={{ overflow: 'visible' }}
            >
                {/* Glow filter for cracks */}
                <defs>
                    <filter id={`crack-glow-${variant}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="0.5" result="blur" />
                        <feFlood floodColor="#fff" floodOpacity="0.8" />
                        <feComposite in2="blur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Main crack paths */}
                {pattern.paths.map((d, i) => (
                    <motion.path
                        key={`crack-${i}`}
                        d={d}
                        fill="none"
                        stroke="white"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={`url(#crack-glow-${variant})`}
                        initial={{
                            pathLength: 0,
                            opacity: 0
                        }}
                        animate={{
                            pathLength: 1,
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            pathLength: {
                                duration: 0.35,
                                delay: i * 0.03,
                                ease: [0.22, 1, 0.36, 1]
                            },
                            opacity: {
                                duration: 0.65,
                                times: [0, 0.3, 0.7, 1],
                                delay: i * 0.03
                            }
                        }}
                        onAnimationComplete={() => {
                            if (i === pattern.paths.length - 1 && onComplete) {
                                onComplete();
                            }
                        }}
                    />
                ))}

                {/* Rune symbols */}
                {pattern.runes.map((rune, i) => (
                    <motion.g key={`rune-${i}`}>
                        {/* Rune glow */}
                        <motion.circle
                            cx={rune.cx}
                            cy={rune.cy}
                            r="3"
                            fill="rgba(168, 85, 247, 0.4)"
                            filter="blur(2px)"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: [0, 0.8, 0],
                                scale: [0, 1.5, 1]
                            }}
                            transition={{
                                duration: 0.4,
                                delay: 0.2 + i * 0.05
                            }}
                        />
                        {/* Rune symbol */}
                        <motion.path
                            d={rune.path}
                            fill="white"
                            stroke="rgba(168, 85, 247, 0.8)"
                            strokeWidth="0.5"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: [0, 1, 1, 0],
                                scale: [0, 1.2, 1, 0.8]
                            }}
                            transition={{
                                duration: 0.5,
                                delay: 0.2 + i * 0.05
                            }}
                        />
                    </motion.g>
                ))}

                {/* Center impact point */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r="2"
                    fill="white"
                    initial={{ opacity: 0, r: 0 }}
                    animate={{
                        opacity: [0, 1, 0.5, 0],
                        r: [0, 3, 2, 1]
                    }}
                    transition={{
                        duration: 0.4,
                        ease: 'easeOut'
                    }}
                />
            </svg>
        </div>
    );
}

PortalCrack.propTypes = {
    variant: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
    isActive: PropTypes.bool,
    onComplete: PropTypes.func
};
