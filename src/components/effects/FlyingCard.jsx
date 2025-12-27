import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function FlyingCard({ card, orbPosition }) {
    if (!orbPosition) return null;

    // --- ANIMATION LOGIC ---

    // 1. ABSORPTION (Default)
    if (card.type !== 'eject') {
        // Center-to-center delta
        const targetX = orbPosition.x - (card.startRect.left + card.startRect.width / 2);
        const targetY = orbPosition.y - (card.startRect.top + card.startRect.height / 2);

        return (
            <div
                style={{
                    position: 'fixed',
                    top: card.startRect.top,
                    left: card.startRect.left,
                    width: card.startRect.width,
                    height: card.startRect.height,
                    zIndex: 9999,
                    perspective: '1000px', // Increased perspective for deeper 3D effect
                    pointerEvents: 'none'
                }}
            >
                <motion.div
                    initial={{
                        x: 0,
                        y: 0,
                        scale: 1,
                        rotateX: 0,
                        opacity: 1,
                    }}
                    animate={{
                        x: targetX,
                        y: targetY,
                        scale: 0.18,          // User spec: 0.18 scale
                        rotateX: 55,          // User spec: 55deg rotation
                        opacity: [1, 1, 0.8, 0.4, 0],  // User spec: fade sequence
                    }}
                    transition={{
                        duration: 1.35,       // User spec: 1.35s
                        ease: [0.25, 0.8, 0.25, 1], // User spec: smooth magical easing
                    }}
                    onAnimationComplete={card.onComplete}
                    className="w-full h-full transform-style-3d origin-center"
                >
                    <CardVisual card={card} />
                </motion.div>
            </div>
        );
    }

    // 2. EJECTION
    else {
        // Start from Orb Center
        // Actually, let's position it at the Orb center initially and animate TO targetRect
        // But we need to match the "phantom" card dimensions.
        // Let's assume the targetRect defines the final size/pos.

        // Delta from Orb Center to Target Center
        const deltaX = (card.targetRect.left + card.targetRect.width / 2) - orbPosition.x;
        const deltaY = (card.targetRect.top + card.targetRect.height / 2) - orbPosition.y;

        return (
            <div
                style={{
                    position: 'fixed',
                    top: orbPosition.y - card.targetRect.height / 2, // Centered on Orb
                    left: orbPosition.x - card.targetRect.width / 2,
                    width: card.targetRect.width,
                    height: card.targetRect.height,
                    zIndex: 9999,
                    perspective: '1000px',
                    pointerEvents: 'none'
                }}
            >
                <motion.div
                    initial={{
                        opacity: 0,
                        rotateX: 60,
                        scale: 0.15,
                        x: 0,
                        y: 0
                    }}
                    animate={[
                        // Stage 1: Burst Out
                        {
                            opacity: 1,
                            rotateX: 20,
                            scale: 0.45,
                            y: -40, // Upward burst
                            transition: { duration: 0.5, ease: "easeOut" }
                        },
                        // Stage 2: Fly to Board
                        {
                            x: deltaX,
                            y: deltaY,
                            rotateX: 0,
                            scale: 1,
                            opacity: 1,
                            transition: { duration: 0.9, ease: "easeInOut" } // Total ~1.4s
                        }
                    ]}
                    onAnimationComplete={card.onComplete}
                    className="w-full h-full transform-style-3d origin-center"
                >
                    <CardVisual card={card} />
                </motion.div>
            </div>
        );
    }
}

function CardVisual({ card }) {
    return (
        <div className={`w-full h-full relative rounded-xl overflow-hidden border border-white/20 bg-[#0d0d15] shadow-2xl ${card.cardData?.className || ''}`}>
            {/* Holographic Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/30 to-cyan-500/30 opacity-60 mix-blend-overlay"></div>

            {/* Card Back/Front simulation */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black p-2 flex flex-col items-center justify-center">
                {/* Icon/Content */}
                {card.cardData?.icon && (
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-white/10">
                        <div className="w-6 h-6 rounded-full bg-purple-500/80 animate-pulse" />
                    </div>
                )}
                <div className="w-3/4 h-2 bg-white/10 rounded mb-1"></div>
                <div className="w-1/2 h-2 bg-white/5 rounded"></div>
                {/* Text for Returned Card */}
                {card.cardData?.title && <div className="mt-2 text-xs text-white/50 text-center">{card.cardData.title}</div>}
            </div>
        </div>
    );
}
