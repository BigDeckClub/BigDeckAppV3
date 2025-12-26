/**
 * MysticOrb - Animated loading/reveal orb component
 * Replaces the loading bar in AI deck generation
 */

import React from 'react';
import PropTypes from 'prop-types';
import './MysticOrb.css';

/**
 * MysticOrb Component
 * @param {Object} props
 * @param {'loading' | 'ready' | 'cracking' | 'idle'} props.state - Current animation state
 * @param {string} props.loadingText - Text to display below the orb
 * @param {string} props.loadingIcon - Emoji icon for loading state
 * @param {'small' | 'medium' | 'large'} props.size - Size of the orb
 * @param {() => void} props.onClick - Optional click handler (for idle state)
 * @param {() => void} props.onCrackComplete - Callback when crack animation finishes
 */
export default function MysticOrb({
    state = 'loading',
    loadingText = 'Gathering energy...',
    loadingIcon = '🔮',
    size = 'medium',
    scale = 1.0,
    onClick,
    onCrackComplete
}) {
    const handleClick = (e) => {
        if (onClick) onClick(e);
        // onCrackComplete is now handled via useEffect when state changes to 'cracking'
    };

    React.useEffect(() => {
        if (state === 'cracking' && onCrackComplete) {
            const timer = setTimeout(() => {
                onCrackComplete();
            }, 500); // 0.5s delay to let the explosion happen
            return () => clearTimeout(timer);
        }
    }, [state, onCrackComplete]);

    const isClickable = state === 'ready' || !!onClick;

    const [currentIdentity, setCurrentIdentity] = React.useState('blue');
    const colors = ['white', 'blue', 'black', 'red', 'green'];

    React.useEffect(() => {
        if (state !== 'loading' && state !== 'idle') return;

        const interval = setInterval(() => {
            setCurrentIdentity(prev => {
                const currentIndex = colors.indexOf(prev);
                return colors[(currentIndex + 1) % colors.length];
            });
        }, 6000); // Slower cycle for 5s transitions

        return () => clearInterval(interval);
    }, [state]);

    return (
        <div className="orb-wrapper" style={{ transform: `scale(${scale})`, transition: 'transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {/* SVG Filter for Organic Distortion */}
            <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                <filter id="orb-organic-filter">
                    <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="3" result="warp">
                        <animate attributeName="baseFrequency" values="0.015;0.025;0.015" dur="15s" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="60" in="SourceGraphic" in2="warp" />
                </filter>
            </svg>

            <div
                className={`orb-container ${state} ${size} ${currentIdentity}`}
                onClick={handleClick}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                        handleClick();
                    }
                }}
            >
                {/* 
                    CROSS-FADE LAYER SYSTEM:
                    Render all 5 environment layers stacked.
                    Only the 'active' one has opacity: 1.
                    This bypasses gradient interpolation issues for perfect smooth transitions.
                */}
                {colors.map((color) => (
                    <div
                        key={color}
                        className={`orb-environment ${color} ${currentIdentity === color ? 'active' : ''}`}
                    />
                ))}

                <div className="orb-lightning" />
                <div className="orb-plasma" />

                {/* Stacked glass shell layers for smooth inner glow transition */}
                {colors.map((color) => (
                    <div
                        key={`core-${color}`}
                        className={`orb-core ${color} ${currentIdentity === color ? 'active' : ''}`}
                    />
                ))}

                {/* Stacked fog layers for smooth glow transition */}
                {colors.map((color) => (
                    <div
                        key={`fog-${color}`}
                        className={`orb-fog-layer ${color} ${currentIdentity === color ? 'active' : ''}`}
                    />
                ))}

                {/* Cracks Layer - Visible only during cracking */}
                <div className="orb-cracks">
                    {/* Inner glowing light burst (handled by CSS pseudo-elements) */}

                    {/* Foreground fracture lines */}
                    <svg viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                        {/* Central spiderweb fractures */}
                        <path pathLength="1" d="M50 50 L50 20 L52 15 M50 50 L80 50 L85 52 M50 50 L50 80 L48 85 M50 50 L20 50 L15 48" className="crack-main" />
                        <path pathLength="1" d="M50 50 L70 30 L75 25 M50 50 L30 70 L25 75 M50 50 L30 30 L25 25 M50 50 L70 70 L75 75" className="crack-main" />

                        {/* Secondary jagged connections */}
                        <path pathLength="1" d="M50 40 L55 35 L60 40 M40 50 L35 55 L40 60" opacity="0.7" className="crack-detail" />
                        <path pathLength="1" d="M60 60 L65 55 M35 35 L30 40" opacity="0.7" className="crack-detail" />

                        {/* Center blowout */}
                        <circle cx="50" cy="50" r="15" fill="white" fillOpacity="0.1" stroke="none" className="crack-center" />
                    </svg>
                </div>

                <div className="orb-ring" style={{ display: 'none' }} />
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
}

MysticOrb.propTypes = {
    state: PropTypes.oneOf(['loading', 'ready', 'cracking', 'idle']),
    loadingText: PropTypes.string,
    loadingIcon: PropTypes.string,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    scale: PropTypes.number,
    onClick: PropTypes.func,
    onCrackComplete: PropTypes.func,
};
