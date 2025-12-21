import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    TrendingUp,
    TrendingDown,
    Target,
    AlertTriangle,
    CheckCircle,
    Loader2,
    RefreshCw,
    BarChart3,
    DollarSign,
    Percent,
    Clock,
    Package,
    ChevronDown,
    ChevronUp,
    Info,
    Lightbulb,
} from 'lucide-react';

/**
 * AnalyticsDashboard - Learning Loop Analytics for Auto-Buy System
 * 
 * Shows:
 * - Prediction accuracy over time
 * - Top performing vs underperforming card purchases
 * - Suggested IPS weight changes
 */
export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accuracyMetrics, setAccuracyMetrics] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [recentRuns, setRecentRuns] = useState([]);
    const [sellThroughMetrics, setSellThroughMetrics] = useState(null);
    const [daysFilter, setDaysFilter] = useState(30);
    const [expandedSections, setExpandedSections] = useState({
        accuracy: true,
        performance: true,
        suggestions: true,
        recentRuns: false,
    });

    // Fetch all analytics data
    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [accuracyRes, suggestionsRes, runsRes, sellThroughRes] = await Promise.allSettled([
                fetch(`/api/autobuy/analytics/accuracy?days=${daysFilter}`),
                fetch('/api/autobuy/analytics/suggestions'),
                fetch('/api/autobuy/analytics/runs?limit=10'),
                fetch(`/api/autobuy/analytics/sell-through?days=${daysFilter}`),
            ]);

            if (accuracyRes.status === 'fulfilled' && accuracyRes.value.ok) {
                const data = await accuracyRes.value.json();
                setAccuracyMetrics(data);
            }

            if (suggestionsRes.status === 'fulfilled' && suggestionsRes.value.ok) {
                const data = await suggestionsRes.value.json();
                setSuggestions(data.suggestions || []);
            }

            if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
                const data = await runsRes.value.json();
                setRecentRuns(data.runs || []);
            }

            if (sellThroughRes.status === 'fulfilled' && sellThroughRes.value.ok) {
                const data = await sellThroughRes.value.json();
                setSellThroughMetrics(data);
            }
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [daysFilter]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const formatCurrency = (amount) => {
        if (typeof amount !== 'number') return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatPercent = (value) => {
        if (typeof value !== 'number') return '0%';
        return `${(value * 100).toFixed(1)}%`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'purchased':
                return 'text-green-400';
            case 'partially_purchased':
                return 'text-yellow-400';
            case 'cancelled':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'high':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (loading && !accuracyMetrics) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="ml-3 text-gray-400">Loading analytics...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Error loading analytics: {error}</span>
                </div>
                <button
                    onClick={fetchAnalytics}
                    className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-[var(--chart-purple)]" />
                        Learning Loop Analytics
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Track prediction accuracy and optimize IPS weights
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={daysFilter}
                        onChange={(e) => setDaysFilter(Number(e.target.value))}
                        className="input text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={60}>Last 60 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>

                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 btn-primary disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Accuracy Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overall Accuracy */}
                <div className="surface p-4 border-l-4 border-l-[var(--chart-purple)]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[var(--text-muted)] text-sm font-medium">Prediction Accuracy</p>
                            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                                {formatPercent(accuracyMetrics?.overallAccuracy || 0)}
                            </p>
                        </div>
                        <div className="p-2 bg-[var(--chart-purple-fill)] rounded-lg">
                            <Target className="w-6 h-6 text-[var(--chart-purple)]" />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        Based on {accuracyMetrics?.totalItems || 0} items
                    </p>
                </div>

                {/* Total Runs */}
                <div className="surface p-4 border-l-4 border-l-[var(--chart-blue)]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[var(--text-muted)] text-sm font-medium">Completed Runs</p>
                            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                                {accuracyMetrics?.totalRuns || 0}
                            </p>
                        </div>
                        <div className="p-2 bg-[var(--chart-blue-fill)] rounded-lg">
                            <Package className="w-6 h-6 text-[var(--chart-blue)]" />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        Purchase runs tracked
                    </p>
                </div>

                {/* Price Variance */}
                <div className="surface p-4 border-l-4 border-l-[var(--chart-emerald)]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[var(--text-muted)] text-sm font-medium">Avg Price Variance</p>
                            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                                {formatCurrency(Math.abs(accuracyMetrics?.avgPriceVariance || 0))}
                            </p>
                        </div>
                        <div className="p-2 bg-[var(--chart-emerald-fill)] rounded-lg">
                            <DollarSign className="w-6 h-6 text-[var(--chart-emerald)]" />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        {(accuracyMetrics?.avgPriceVariancePercent || 0) > 0 ? 'Underpaid' : 'Overpaid'} on avg
                    </p>
                </div>

                {/* Sell-Through Rate */}
                <div className="surface p-4 border-l-4 border-l-[var(--chart-amber)]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[var(--text-muted)] text-sm font-medium">Sell-Through Rate</p>
                            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                                {formatPercent(sellThroughMetrics?.sellThroughRate || 0)}
                            </p>
                        </div>
                        <div className="p-2 bg-[var(--chart-amber-fill)] rounded-lg">
                            <TrendingUp className="w-6 h-6 text-[var(--chart-amber)]" />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        {sellThroughMetrics?.totalSold || 0} / {sellThroughMetrics?.totalPurchased || 0} cards sold
                    </p>
                </div>
            </div>

            {/* Weight Adjustment Suggestions */}
            {suggestions.length > 0 && (
                <div className="surface overflow-hidden">
                    <button
                        onClick={() => toggleSection('suggestions')}
                        className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-hover)] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Lightbulb className="w-5 h-5 text-[var(--chart-amber)]" />
                            <span className="font-semibold text-[var(--text-primary)]">IPS Weight Suggestions</span>
                            <span className="px-2 py-0.5 bg-[var(--chart-amber-fill)] text-[var(--chart-amber)] text-xs rounded-full">
                                {suggestions.length} suggestions
                            </span>
                        </div>
                        {expandedSections.suggestions ? (
                            <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                        )}
                    </button>

                    {expandedSections.suggestions && (
                        <div className="border-t border-[var(--border)] p-4 space-y-4">
                            {suggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium text-[var(--text-primary)]">
                                                    {suggestion.weightName}
                                                </span>
                                                <span className={`px-2 py-0.5 text-xs rounded-full border ${getConfidenceColor(suggestion.confidence)}`}>
                                                    {suggestion.confidence} confidence
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mb-3">
                                                {suggestion.reason}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Current:</span>
                                                    <span className="font-mono text-white">{suggestion.currentValue}</span>
                                                </div>
                                                <TrendingUp className={`w-4 h-4 ${suggestion.suggestedValue > suggestion.currentValue ? 'text-green-400' : 'text-red-400'}`} />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Suggested:</span>
                                                    <span className={`font-mono ${suggestion.suggestedValue > suggestion.currentValue ? 'text-green-400' : 'text-red-400'}`}>
                                                        {suggestion.suggestedValue}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm text-gray-500">
                                            Based on {suggestion.basedOnCards} cards
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-300">
                                    These suggestions are based on historical purchase outcomes.
                                    Review carefully before applying changes to your IPS configuration.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Card Performance Breakdown */}
            {accuracyMetrics?.itemBreakdown?.length > 0 && (
                <div className="surface overflow-hidden">
                    <button
                        onClick={() => toggleSection('performance')}
                        className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-hover)] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-[var(--chart-purple)]" />
                            <span className="font-semibold text-[var(--text-primary)]">Card Performance Breakdown</span>
                        </div>
                        {expandedSections.performance ? (
                            <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                        )}
                    </button>

                    {expandedSections.performance && (
                        <div className="border-t border-[var(--border)] overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[var(--muted-surface)]">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Card
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Predicted
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Actual
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Variance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {accuracyMetrics.itemBreakdown.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-[var(--card-hover)] transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-[var(--text-primary)] font-medium">{item.cardName || item.cardId}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                {formatCurrency(item.predictedTotal)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                {formatCurrency(item.actualTotal)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`flex items-center justify-end gap-1 ${item.variancePercent > 0 ? 'text-[var(--chart-red)]' : 'text-[var(--chart-emerald)]'}`}>
                                                    {item.variancePercent > 0 ? (
                                                        <TrendingUp className="w-4 h-4" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4" />
                                                    )}
                                                    {Math.abs(item.variancePercent).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Runs */}
            <div className="surface overflow-hidden">
                <button
                    onClick={() => toggleSection('recentRuns')}
                    className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-hover)] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[var(--chart-blue)]" />
                        <span className="font-semibold text-[var(--text-primary)]">Recent Autobuy Runs</span>
                        <span className="px-2 py-0.5 bg-[var(--chart-blue-fill)] text-[var(--chart-blue)] text-xs rounded-full">
                            {recentRuns.length} runs
                        </span>
                    </div>
                    {expandedSections.recentRuns ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                </button>

                {expandedSections.recentRuns && (
                    <div className="border-t border-[var(--border)] overflow-x-auto">
                        {recentRuns.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No purchase runs recorded yet</p>
                                <p className="text-sm mt-1">Run the autobuy optimizer to start tracking</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-[var(--muted-surface)]">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Date
                                        </th>
                                        <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Status
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Items
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Predicted
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
                                            Actual
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {recentRuns.map((run) => (
                                        <tr key={run.id} className="hover:bg-[var(--card-hover)] transition-colors">
                                            <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                {formatDate(run.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`flex items-center gap-2 ${getStatusColor(run.status)}`}>
                                                    {run.status === 'purchased' && <CheckCircle className="w-4 h-4" />}
                                                    {run.status === 'partially_purchased' && <AlertTriangle className="w-4 h-4" />}
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                {run.purchased_count} / {run.item_count}
                                            </td>
                                            <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                {formatCurrency(run.predicted_total)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                {run.actual_total ? formatCurrency(run.actual_total) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!accuracyMetrics?.totalRuns && suggestions.length === 0 && (
                <div className="surface p-8 text-center">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Analytics Data Yet</h3>
                    <p className="text-[var(--text-muted)] max-w-md mx-auto">
                        Start using the Auto-Buy optimizer and record your purchases to see prediction accuracy,
                        performance breakdowns, and IPS weight suggestions.
                    </p>
                </div>
            )}
        </div>
    );
}

AnalyticsDashboard.propTypes = {
    // No required props - component fetches its own data
};
