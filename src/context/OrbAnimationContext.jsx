import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const OrbAnimationContext = createContext(null);

export function OrbAnimationProvider({ children }) {
    const [flyingCards, setFlyingCards] = useState([]);
    const [orbPosition, setOrbPosition] = useState(null);
    const orbRef = useRef(null);

    const registerOrb = useCallback((element) => {
        orbRef.current = element;
        // Initial measurement
        if (element) {
            const rect = element.getBoundingClientRect();
            setOrbPosition({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
            });
        }
    }, []);

    // Recalculate orb position on window resize or when needed
    const updateOrbPosition = useCallback(() => {
        if (orbRef.current) {
            const rect = orbRef.current.getBoundingClientRect();
            setOrbPosition({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
            });
        }
    }, []);

    const absorbCard = useCallback((startRect, cardData, onComplete) => {
        updateOrbPosition(); // Ensure we have latest position

        const id = uuidv4();
        const newFlyingCard = {
            id,
            type: 'absorb',
            startRect, // { top, left, width, height }
            cardData, // content to render
            onComplete: () => {
                setFlyingCards(prev => prev.filter(c => c.id !== id));
                if (onComplete) onComplete();
            }
        };

        setFlyingCards(prev => [...prev, newFlyingCard]);
    }, [updateOrbPosition]);

    const ejectCard = useCallback((targetRect, cardData, onComplete) => {
        updateOrbPosition(); // Should be center of Orb

        // Trigger Orb Pulse (Visual Burst)
        if (orbRef.current) {
            orbRef.current.classList.remove('pulse-portal');
            orbRef.current.classList.remove('pulse-portal-final');
            void orbRef.current.offsetWidth; // Force reflow

            // Use the STRONG final pulse
            orbRef.current.classList.add('pulse-portal-final');

            // Cleanup class after animation (approx 400ms matching CSS)
            setTimeout(() => {
                if (orbRef.current) orbRef.current.classList.remove('pulse-portal-final');
            }, 400);
        }

        const id = uuidv4();
        const newFlyingCard = {
            id,
            type: 'eject',
            targetRect, // Where it lands
            cardData,
            onComplete: () => {
                setFlyingCards(prev => prev.filter(c => c.id !== id));
                if (onComplete) onComplete();
            }
        };

        setFlyingCards(prev => [...prev, newFlyingCard]);
    }, [updateOrbPosition]);

    return (
        <OrbAnimationContext.Provider value={{
            registerOrb,
            absorbCard,
            ejectCard,
            flyingCards,
            orbPosition
        }}>
            {children}
        </OrbAnimationContext.Provider>
    );
}

export function useOrbAnimation() {
    const context = useContext(OrbAnimationContext);
    if (!context) {
        throw new Error('useOrbAnimation must be used within an OrbAnimationProvider');
    }
    return context;
}
