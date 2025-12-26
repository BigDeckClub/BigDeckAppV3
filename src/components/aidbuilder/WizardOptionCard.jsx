/**
 * WizardOptionCard - Selectable card for the deck builder wizard
 */
import React from 'react';
import { Check } from 'lucide-react';
import Card from '../ui/Card';

export default function WizardOptionCard({
    icon: Icon,
    title,
    description,
    onClick,
    selected,
    className = '',
    children,
    backContent
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick && onClick(e);
                }
            }}
            className={`w-full aspect-[3/4] bg-transparent group relative cursor-pointer outline-none preserve-3d ${className}`}
        >
            {/* Inner Container for 3D structure - Animation applies to parent (this div) or handled via CSS on parent if reusing className */}
            <div className="w-full h-full relative transform-style-3d">

                {/* FRONT FACE */}
                <div className="absolute inset-0 backface-hidden card-face-front">
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur`}></div>
                    <Card
                        className={`relative h-full p-6 border transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 bg-[#0d0d15] border-white/10 hover:bg-white/5`}
                    >
                        <div>
                            <div className={`p-4 rounded-xl inline-flex transition-colors ${selected ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400 group-hover:text-white'}`}>
                                {Icon && <Icon className="w-8 h-8" />}
                                {!Icon && <div className="w-8 h-8" />}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <h3 className={`text-xl font-bold mb-2 transition-colors ${selected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                {title}
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300">
                                {description}
                            </p>
                            {children}
                        </div>
                    </Card>
                </div>

                {/* BACK FACE */}
                <div className={`absolute inset-0 backface-hidden card-face-back ${backContent ? 'has-custom-content' : ''}`}>
                    {backContent ? (
                        <div className="w-full h-full">
                            {backContent}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 opacity-50">
                            <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20"></div>
                            </div>
                            <span className="text-xs font-mono tracking-[0.2em] text-purple-300/50 uppercase">Mystic Orb</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
