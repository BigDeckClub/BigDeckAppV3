import React from 'react';

export const TCGPlayerIcon = ({ className = "w-6 h-6" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm-1-7.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm5 7.75h-2v-6h2v6zm-1-7.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
        <path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" fill="none" />
        <circle cx="12" cy="12" r="1.5" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fillOpacity="0.3" />
        {/* Simplified representation - standard Material icon style for now to ensure visibility */}
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" opacity="0" />
        {/* Actual TCGPlayer Logo approximation */}
        <path d="M4 6h16v2H4zm2 4h12v2H6zm4 4h4v2h-4z" />
    </svg>
);

export const TCGPlayerLogo = ({ className = "w-24 h-8" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 32" className={className} fill="currentColor">
        <rect x="0" y="0" width="30" height="30" rx="4" fill="#24292e" />
        <path d="M15 5v20M5 15h20" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <text x="36" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="20" fill="currentColor">TCG</text>
    </svg>
);


export const CardKingdomIcon = ({ className = "w-6 h-6" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 2l-3 6-5 1 4 4-1 6 5-3 5 3-1-6 4-4-5-1-3-6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1" />
    </svg>
);

// Better SVGs based on brand colors/shapes
export const TCGPlayerBrandIcon = ({ className = "w-6 h-6" }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 7C2 4.23858 4.23858 2 7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7Z" fill="#2f3134" />
        <rect x="6" y="7" width="12" height="2" rx="1" fill="white" />
        <rect x="8" y="11" width="8" height="2" rx="1" fill="white" />
        <rect x="10" y="15" width="4" height="2" rx="1" fill="white" />
    </svg>
);

export const CardKingdomBrandIcon = ({ className = "w-6 h-6" }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7L12 2L21 7V19C21 20.6569 19.6569 22 18 22H6C4.34315 22 3 20.6569 3 19V7Z" fill="#1b2c48" />
        <path d="M12 5L18 8V18H6V8L12 5Z" fill="#2d4a77" />
        <path d="M12 8L15 10V15H9V10L12 8Z" fill="#fbb03b" />
    </svg>
);
