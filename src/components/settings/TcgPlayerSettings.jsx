
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Mail, Lock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { SettingsSection } from '../ui';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';

export const TcgPlayerSettings = () => {
    const { showToast } = useToast();
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ accountName: '', email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const data = await api.get('/tcgplayer/accounts');
            setAccounts(data || []);
        } catch (error) {
            console.error('Failed to load accounts:', error);
            showToast('Failed to load TCGPlayer accounts', TOAST_TYPES.ERROR);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/tcgplayer/accounts', formData);
            showToast('Account added successfully', TOAST_TYPES.SUCCESS);
            setIsAdding(false);
            setFormData({ accountName: '', email: '', password: '' });
            loadAccounts();
        } catch (error) {
            showToast(error.message || 'Failed to add account', TOAST_TYPES.ERROR);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAccount = async (id) => {
        if (!confirm('Are you sure you want to remove this account?')) return;
        try {
            await api.delete(`/tcgplayer/accounts/${id}`);
            showToast('Account removed', TOAST_TYPES.SUCCESS);
            loadAccounts();
        } catch (error) {
            showToast('Failed to remove account', TOAST_TYPES.ERROR);
        }
    };

    return (
        <SettingsSection
            title="TCGPlayer Accounts"
            description="Manage accounts for Assisted Checkout automation."
            icon={Shield}
            defaultExpanded={true}
        >
            <div className="space-y-4">
                {/* Account List */}
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                ) : accounts.length === 0 && !isAdding ? (
                    <div className="text-center p-6 border border-dashed border-slate-700 rounded-lg">
                        <p className="text-slate-400 mb-4">No accounts connected.</p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Connect Account
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {accounts.map(acc => (
                            <div key={acc.id} className="glass-panel p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">{acc.account_name}</h4>
                                        <p className="text-xs text-slate-400">{acc.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveAccount(acc.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove Account"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Button (if list not empty) */}
                {accounts.length > 0 && !isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full py-2 border border-dashed border-slate-700 text-slate-400 hover:text-purple-400 hover:border-purple-500/50 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Another Account
                    </button>
                )}

                {/* Add Form */}
                {isAdding && (
                    <form onSubmit={handleAddAccount} className="glass-panel p-4 border border-purple-500/30">
                        <h4 className="font-medium text-white mb-4">Connect TCGPlayer Account</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Account Label</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Personal Account"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                    value={formData.accountName}
                                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="email@example.com"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded text-sm flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Save Account
                            </button>
                        </div>
                        <div className="mt-3 flex items-start gap-2 bg-yellow-500/10 p-2 rounded text-xs text-yellow-200/80">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>Credentials are encrypted and stored securely. They are used only for local browser automation.</p>
                        </div>
                    </form>
                )}
            </div>
        </SettingsSection>
    );
};
