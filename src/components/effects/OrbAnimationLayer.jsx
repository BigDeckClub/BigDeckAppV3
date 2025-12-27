import React from 'react';
import { useOrbAnimation } from '../../context/OrbAnimationContext';
import FlyingCard from './FlyingCard';
import { AnimatePresence } from 'framer-motion';

export default function OrbAnimationLayer() {
    const { flyingCards, orbPosition } = useOrbAnimation();

    if (flyingCards.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <AnimatePresence>
                {flyingCards.map(card => (
                    <FlyingCard
                        key={card.id}
                        card={card}
                        orbPosition={orbPosition}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
