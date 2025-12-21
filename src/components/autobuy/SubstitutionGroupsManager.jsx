import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Layers,
    Plus,
    Trash2,
    X,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
    CheckCircle,
    Search,
    Package,
} from 'lucide-react';

/**
 * SubstitutionGroupsManager - Manage card substitution groups for IPS calculations
 * 
 * Cards in the same group are considered interchangeable for demand purposes.
 * If Sol Ring is low but Mana Crypt is in stock, Sol Ring's IPS is reduced.
 */
export function SubstitutionGroupsManager() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupCards, setNewGroupCards] = useState('');
    const [creating, setCreating] = useState(false);

    // Fetch groups on mount
    const fetchGroups = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetch('/api/autobuy/substitution-groups');
            if (!resp.ok) throw new Error(`API error: ${resp.status}`);
            const data = await resp.json();
            setGroups(data.groups || []);
        } catch (err) {
            setError(err.message || 'Failed to load substitution groups');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;

        setCreating(true);
        try {
            // Parse card entries (one per line, format: scryfallId|cardName)
            const cards = newGroupCards
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => {
                    const [scryfallId, cardName] = line.split('|').map(s => s.trim());
                    return { scryfallId, cardName };
                })
                .filter(c => c.scryfallId);

            const resp = await fetch('/api/autobuy/substitution-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newGroupName.trim(),
                    description: newGroupDescription.trim() || undefined,
                    cards,
                }),
            });

            if (!resp.ok) {
                const data = await resp.json();
                throw new Error(data.error || `API error: ${resp.status}`);
            }

            // Reset form and refresh
            setNewGroupName('');
            setNewGroupDescription('');
            setNewGroupCards('');
            setShowCreateModal(false);
            fetchGroups();
        } catch (err) {
            setError(err.message || 'Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm('Are you sure you want to delete this group?')) return;

        try {
            const resp = await fetch(`/api/autobuy/substitution-groups/${groupId}`, {
                method: 'DELETE',
            });
            if (!resp.ok) throw new Error(`API error: ${resp.status}`);
            fetchGroups();
        } catch (err) {
            setError(err.message || 'Failed to delete group');
        }
    };

    const handleRemoveCard = async (groupId, cardId) => {
        try {
            const resp = await fetch(`/api/autobuy/substitution-groups/${groupId}/cards/${cardId}`, {
                method: 'DELETE',
            });
            if (!resp.ok) throw new Error(`API error: ${resp.status}`);
            fetchGroups();
        } catch (err) {
            setError(err.message || 'Failed to remove card');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                <span className="ml-3 text-[var(--text-muted)]">Loading substitution groups...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Layers className="w-5 h-5 text-[var(--accent)]" />
                        Substitution Groups
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Group interchangeable cards to share demand pressure in IPS calculations
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Group
                </button>
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

            {/* Groups List */}
            {groups.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                    <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-muted)]">No substitution groups yet</p>
                    <p className="text-sm text-[var(--text-muted)]/70 mt-1">
                        Create a group to track interchangeable cards like Sol Ring / Mana Crypt
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map(group => (
                        <div key={group.id} className="glass-panel overflow-hidden">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--card-hover)] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Layers className="w-4 h-4 text-[var(--accent)]" />
                                    <span className="font-medium text-[var(--text-primary)]">{group.name}</span>
                                    <span className="text-sm text-[var(--text-muted)]">
                                        {group.cards?.length || 0} cards
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                        className="p-1.5 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                        title="Delete group"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {expandedGroups.has(group.id) ? (
                                        <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {expandedGroups.has(group.id) && (
                                <div className="border-t border-[var(--border)] p-4">
                                    {group.description && (
                                        <p className="text-sm text-[var(--text-muted)] mb-3">{group.description}</p>
                                    )}
                                    <div className="space-y-2">
                                        {(group.cardDetails || []).map(card => (
                                            <div
                                                key={card.scryfallId}
                                                className="flex items-center justify-between bg-[var(--surface)] rounded px-3 py-2"
                                            >
                                                <div>
                                                    <span className="text-[var(--text-primary)]">
                                                        {card.cardName || 'Unknown Card'}
                                                    </span>
                                                    <span className="ml-2 text-xs text-[var(--text-muted)] font-mono">
                                                        {card.scryfallId.slice(0, 8)}...
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCard(group.id, card.scryfallId)}
                                                    className="p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                                    title="Remove card"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(!group.cardDetails || group.cardDetails.length === 0) && (
                                            <p className="text-sm text-[var(--text-muted)] text-center py-2">
                                                No cards in this group
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-panel w-full max-w-md mx-4 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                Create Substitution Group
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 rounded hover:bg-[var(--card-hover)] text-[var(--text-muted)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g., Mana Rocks"
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                    placeholder="e.g., Interchangeable mana acceleration"
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Initial Cards (one per line)
                                </label>
                                <textarea
                                    value={newGroupCards}
                                    onChange={(e) => setNewGroupCards(e.target.value)}
                                    placeholder="scryfallId|Card Name
scryfallId2|Card Name 2"
                                    className="input w-full h-24 font-mono text-sm"
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Format: scryfallId|CardName (Card name is optional)
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={!newGroupName.trim() || creating}
                                className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Create Group
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

SubstitutionGroupsManager.propTypes = {};

export default SubstitutionGroupsManager;
