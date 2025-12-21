import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Calendar,
    Plus,
    Trash2,
    X,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Sun,
    Snowflake,
    AlertTriangle,
    Package,
    Edit2,
} from 'lucide-react';

/**
 * SeasonalityManager - View and manage seasonal events affecting IPS calculations
 * 
 * Seasonal factors adjust card IPS scores based on events like:
 * - Set releases
 * - Ban announcements
 * - Commander products
 * - Holiday periods
 */
export function SeasonalityManager() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpcoming, setShowUpcoming] = useState(true);

    // Load seasonal events from config file
    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch seasonal events from API (if endpoint exists) or use static data
            const resp = await fetch('/api/autobuy/seasonality-config');
            if (resp.ok) {
                const data = await resp.json();
                setEvents(data.events || []);
            } else {
                // Fallback to showing info about the config file
                setEvents([]);
            }
        } catch (err) {
            // If endpoint doesn't exist, show instructions
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const getEventTypeIcon = (type) => {
        switch (type) {
            case 'set_release':
                return <Package className="w-4 h-4 text-blue-400" />;
            case 'commander_product':
                return <TrendingUp className="w-4 h-4 text-purple-400" />;
            case 'ban_announcement':
                return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case 'holiday':
                return <Snowflake className="w-4 h-4 text-cyan-400" />;
            case 'reprint':
                return <TrendingDown className="w-4 h-4 text-amber-400" />;
            default:
                return <Calendar className="w-4 h-4 text-[var(--accent)]" />;
        }
    };

    const getEventTypeLabel = (type) => {
        const labels = {
            set_release: 'Set Release',
            commander_product: 'Commander Product',
            ban_announcement: 'Ban Announcement',
            holiday: 'Holiday',
            reprint: 'Reprint',
        };
        return labels[type] || type;
    };

    const getEventTypeColor = (type) => {
        const colors = {
            set_release: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            commander_product: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            ban_announcement: 'bg-red-500/20 text-red-400 border-red-500/30',
            holiday: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            reprint: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        };
        return colors[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    };

    const isUpcoming = (dateStr) => {
        const eventDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getDaysUntil = (dateStr) => {
        const eventDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const upcomingEvents = events.filter(e => isUpcoming(e.date));
    const pastEvents = events.filter(e => !isUpcoming(e.date));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                <span className="ml-3 text-[var(--text-muted)]">Loading seasonal events...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[var(--accent)]" />
                        Seasonality Events
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Events that adjust IPS scores (set releases, bans, holidays)
                    </p>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-300">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-blue-300 font-medium">Seasonal events are configured via JSON file</p>
                        <p className="text-blue-300/70 mt-1">
                            Edit <code className="px-1 py-0.5 bg-blue-500/20 rounded text-xs">server/autobuy/data/seasonal-events.json</code> to add or modify events.
                            The IPS calculator automatically adjusts scores based on upcoming events.
                        </p>
                    </div>
                </div>
            </div>

            {/* Multiplier Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-panel p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">1.3×</div>
                    <div className="text-xs text-[var(--text-muted)]">Commander Product</div>
                    <div className="text-xs text-[var(--text-muted)]/70">2 weeks before</div>
                </div>
                <div className="glass-panel p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-400">1.2×</div>
                    <div className="text-xs text-[var(--text-muted)]">Christmas</div>
                    <div className="text-xs text-[var(--text-muted)]/70">1 week before</div>
                </div>
                <div className="glass-panel p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">1.5×</div>
                    <div className="text-xs text-[var(--text-muted)]">Ban Announcement</div>
                    <div className="text-xs text-[var(--text-muted)]/70">1 week after</div>
                </div>
                <div className="glass-panel p-3 text-center">
                    <div className="text-2xl font-bold text-amber-400">0.6×</div>
                    <div className="text-xs text-[var(--text-muted)]">Reprint</div>
                    <div className="text-xs text-[var(--text-muted)]/70">30 days after</div>
                </div>
            </div>

            {/* Events List */}
            {events.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                    <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-muted)]">No seasonal events configured</p>
                    <p className="text-sm text-[var(--text-muted)]/70 mt-1">
                        Add events to the seasonal-events.json file
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowUpcoming(!showUpcoming)}
                                className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2 hover:text-[var(--text-primary)]"
                            >
                                {showUpcoming ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                Upcoming Events ({upcomingEvents.length})
                            </button>
                            {showUpcoming && (
                                <div className="space-y-2">
                                    {upcomingEvents.map((event, idx) => {
                                        const daysUntil = getDaysUntil(event.date);
                                        return (
                                            <div
                                                key={idx}
                                                className="glass-panel p-3 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getEventTypeIcon(event.type)}
                                                    <div>
                                                        <div className="font-medium text-[var(--text-primary)]">
                                                            {event.name}
                                                        </div>
                                                        <div className="text-sm text-[var(--text-muted)]">
                                                            {formatDate(event.date)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                                                        {getEventTypeLabel(event.type)}
                                                    </span>
                                                    <span className={`text-sm font-medium ${daysUntil <= 7 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                                                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Past Events (collapsed by default) */}
                    {pastEvents.length > 0 && (
                        <div className="opacity-60">
                            <div className="text-sm font-medium text-[var(--text-muted)] mb-2">
                                Past Events ({pastEvents.length})
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

SeasonalityManager.propTypes = {};

export default SeasonalityManager;
