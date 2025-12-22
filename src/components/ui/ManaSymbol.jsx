import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * ManaSymbol - Displays an MTG mana symbol
 * Supports W, U, B, R, G, C, and numeric costs
 */
export const ManaSymbol = memo(function ManaSymbol({ symbol, size = 'sm', className = '' }) {
    const s = String(symbol).toUpperCase();

    // Size mappings
    const sizes = {
        xs: 'w-4 h-4',
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-10 h-10'
    };
    const sizeClass = sizes[size] || sizes.sm;

    // SVG Paths for Mana Symbols
    const paths = {
        W: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#f8e7b9" stroke="#b6a070" strokeWidth="3" />
                <path d="M50,18 L55,40 L78,35 L62,52 L75,70 L53,65 L50,88 L47,65 L25,70 L38,52 L22,35 L45,40 Z" fill="#b6a070" opacity="0.8" />
                <path d="M50,22 L54,40 L70,36 L58,50 L68,65 L52,60 L50,80 L48,60 L32,65 L42,50 L30,36 L46,40 Z" fill="#f9faf4" />
            </svg>
        ),
        U: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#aae0fa" stroke="#0e68ab" strokeWidth="3" />
                <path d="M50,20 C50,20 65,35 65,55 C65,75 50,85 50,85 C50,85 35,75 35,55 C35,35 50,20 50,20 Z" fill="#b3ceea" stroke="#0e68ab" strokeWidth="1" />
                <path d="M62,55 C62,70 55,80 50,80 C45,80 38,70 38,55 C38,40 50,25 50,25 C50,25 62,40 62,55 Z" fill="#0e68ab" opacity="0.2" />
                <path d="M50,25 C50,25 60,40 60,55 C60,70 50,80 50,80 C50,80 40,70 40,55 C40,40 50,25 50,25" fill="#0e68ab" />
            </svg>
        ),
        B: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#cbc2bf" stroke="#150b00" strokeWidth="3" />
                <path d="M50,20 C50,20 60,25 60,35 C60,45 50,55 50,55 C50,55 70,50 70,65 C70,80 50,85 50,85 C50,85 30,80 30,65 C30,50 50,55 50,55 C50,55 40,45 40,35 C40,25 50,20 50,20" fill="#150b00" />
                <circle cx="45" cy="35" r="3" fill="#cbc2bf" />
                <circle cx="55" cy="35" r="3" fill="#cbc2bf" />
                <path d="M42,65 L58,65 L50,75 Z" fill="#cbc2bf" />
            </svg>
        ),
        R: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#f9aa8f" stroke="#d3202a" strokeWidth="3" />
                <path d="M50,20 C50,20 65,30 60,45 C55,60 50,50 50,50 C50,50 75,55 70,75 C65,95 35,95 30,75 C25,55 50,50 50,50 C50,50 45,60 40,45 C35,30 50,20 50,20" fill="#d3202a" />
                <path d="M60,40 L40,65 M65,65 L35,40" stroke="#f9aa8f" strokeWidth="2" opacity="0.3" />
            </svg>
        ),
        G: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#9bd3ae" stroke="#00733e" strokeWidth="3" />
                <path d="M50,20 L60,35 L80,35 L65,55 L75,75 L55,65 L50,85 L45,65 L25,75 L35,55 L20,35 L40,35 Z" fill="#00733e" />
                <path d="M50,25 L50,80 M25,50 L75,50" stroke="#9bd3ae" strokeWidth="2" opacity="0.3" />
            </svg>
        ),
        C: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#ccc2c0" stroke="#897e7d" strokeWidth="3" />
                <path d="M50,15 L70,50 L50,85 L30,50 Z" fill="#4d4443" />
                <path d="M50,25 L63,50 L50,75 L37,50 Z" fill="#ccc2c0" />
            </svg>
        ),
        DEFAULT: (
            <span className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-800 rounded-full font-bold text-xs ring-1 ring-gray-400">
                {s}
            </span>
        )
    };

    return (
        <div
            className={`relative inline-block select-none ${sizeClass} ${className}`}
            title={`Mana: ${s}`}
        >
            {paths[s] || paths.DEFAULT}
        </div>
    );
});

ManaSymbol.propTypes = {
    symbol: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
    className: PropTypes.string,
};

export default ManaSymbol;
