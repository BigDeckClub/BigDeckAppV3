import { useState, useCallback, useRef } from 'react';
import { api } from '../utils/apiClient';

/**
 * useCardMetadata hook - Fetch card metadata (CMC, colors, types) from backend
 * Uses MTGJSON-enriched local database to avoid Scryfall rate limits
 */
export function useCardMetadata() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const cacheRef = useRef({}); // Local cache for the session

    /**
     * Fetch metadata for a list of card names
     * @param {string[]} names - Array of card names
     * @returns {Promise<Object>} - Map of name -> metadata
     */
    const fetchMetadata = useCallback(async (names) => {
        if (!names || names.length === 0) return {};

        const missingNames = names.filter(name => !cacheRef.current[name.toLowerCase().trim()]);

        if (missingNames.length === 0) {
            // All names are in cache
            const result = {};
            names.forEach(name => {
                result[name] = cacheRef.current[name.toLowerCase().trim()];
            });
            return result;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch from backend in batches of 50 to avoid long URLs
            const batchSize = 50;
            const results = { ...cacheRef.current };

            for (let i = 0; i < missingNames.length; i += batchSize) {
                const batch = missingNames.slice(i, i + batchSize);
                const namesParam = encodeURIComponent(batch.join(','));
                const response = await api.get(`/cards/metadata?names=${namesParam}`);

                // Merge results
                Object.entries(response).forEach(([name, data]) => {
                    results[name.toLowerCase().trim()] = data;
                    cacheRef.current[name.toLowerCase().trim()] = data;
                });
            }

            setLoading(false);

            const finalResult = {};
            names.forEach(name => {
                finalResult[name] = results[name.toLowerCase().trim()];
            });
            return finalResult;
        } catch (err) {
            console.error('[useCardMetadata] Error:', err.message);
            setError(err.message);
            setLoading(false);
            return {};
        }
    }, []);

    return { fetchMetadata, loading, error };
}

export default useCardMetadata;
