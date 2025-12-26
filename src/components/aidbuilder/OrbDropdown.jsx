import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function OrbDropdown({ label, icon: Icon, active, children, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200
                    ${active
                        ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                    }
                `}
            >
                {Icon && <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-gray-400'}`} />}
                <span className="text-sm font-medium">{label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${active ? 'text-purple-400' : 'text-gray-500'}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 min-w-[260px] bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-100">
                    {children}
                </div>
            )}
        </div>
    );
}
