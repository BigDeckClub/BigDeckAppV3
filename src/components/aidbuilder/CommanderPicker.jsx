import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Search, Loader2 } from 'lucide-react';

/**
 * CommanderPicker - Inline commander selection interface for the AI deck builder.
 * Shows as a chat message with search and selection options.
 * Clicking a commander immediately triggers deck generation.
 *
 * Props:
 *   - isOpen: boolean - Whether the picker is visible
 *   - onSelect: (commander) => void - Called when user selects a commander
 *   - initialQuery: string - Pre-fill the search box (e.g., from prompt)
 */
export default function CommanderPicker({ isOpen, onSelect, initialQuery = '' }) {
    const { get } = useApi();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // When modal opens with initialQuery, trigger search
    useEffect(() => {
        if (isOpen && initialQuery && initialQuery.length >= 2) {
            setQuery(initialQuery);
            handleSearch(initialQuery);
        }
    }, [isOpen, initialQuery]);

    const handleSearch = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await get(`/ai/search-commanders?q=${encodeURIComponent(searchQuery)}`);
            setResults(data.commanders || []);
        } catch (err) {
            console.error('Commander search failed:', err);
            setError(err.message || "Failed to search commanders");
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search on query change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                handleSearch(query);
            } else {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="mt-2 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Box */}
            <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search commanders..."
                    className="w-full pl-7 pr-7 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                />
                {loading && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 animate-spin" />
                )}
            </div>

            {/* Results List */}
            <div className="max-h-64 overflow-y-auto space-y-1">
                {error && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-center">
                        <p className="font-semibold text-xs">Search Error</p>
                        <p className="opacity-80 text-xs">{error}</p>
                    </div>
                )}
                {results.length === 0 && !loading && !error && query.length >= 2 && (
                    <p className="text-gray-400 text-center py-3 text-xs">No commanders found for "{query}"</p>
                )}
                {results.map((commander) => (
                    <button
                        key={commander.scryfallId}
                        onClick={(e) => onSelect(commander, e)}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg border border-white/10 bg-black/20 hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                    >
                        {commander.imageUrl && (
                            <img
                                src={commander.imageUrl}
                                alt={commander.name}
                                className="w-8 h-auto rounded"
                            />
                        )}
                        <div className="flex-1 text-left">
                            <p className="text-white font-medium text-xs">{commander.name}</p>
                            <p className="text-gray-400" style={{ fontSize: '10px' }}>{commander.typeLine}</p>
                            <div className="flex gap-0.5 mt-0.5">
                                {commander.colorIdentity?.map((color) => (
                                    <span
                                        key={color}
                                        className={`w-3 h-3 rounded-full text-[8px] flex items-center justify-center font-bold ${color === 'W' ? 'bg-yellow-100 text-yellow-800' :
                                            color === 'U' ? 'bg-blue-400 text-blue-900' :
                                                color === 'B' ? 'bg-gray-700 text-white' :
                                                    color === 'R' ? 'bg-red-500 text-white' :
                                                        color === 'G' ? 'bg-green-500 text-white' :
                                                            'bg-gray-400 text-white'
                                            }`}
                                    >
                                        {color}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
