
import React, { useState, useEffect } from 'react';
import { Play, Shield, Loader2, AlertCircle, ShoppingCart } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { Modal, Select } from '../ui';

export const AutomationLaunchModal = ({ isOpen, onClose, basket, onLaunch, preferences }) => {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('manual');
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
        }
    }, [isOpen]);

    const loadAccounts = async () => {
        setIsLoadingAccounts(true);
        try {
            const data = await api.get('/tcgplayer/accounts');
            setAccounts(data || []);
            // Default to first account if available
            if (data && data.length > 0) {
                setSelectedAccountId(data[0].id);
            } else {
                setSelectedAccountId('manual');
            }
        } catch (error) {
            console.error('Failed to load accounts', error);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    const handleConfirm = () => {
        onLaunch({
            accountId: selectedAccountId === 'manual' ? null : selectedAccountId,
            mode: 'DIRECT' // We default to Direct now as per user preference
        });
        onClose();
    };

    if (!basket) return null;

    const itemCount = basket.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Launch TCGPlayer Automation"
            icon={ShoppingCart}
            size="md"
        >
            <div className="space-y-6">

                {/* Summary */}
                <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                    <div>
                        <p className="text-sm text-slate-400">Target Seller</p>
                        <p className="text-lg font-bold text-white">{basket.sellerId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Items to Add</p>
                        <p className="text-lg font-bold text-green-400">{itemCount} cards</p>
                    </div>
                </div>

                {/* Account Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Select Account for Auto-Login</label>
                    {isLoadingAccounts ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm p-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts...
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.account_name} ({acc.email})
                                    </option>
                                ))}
                                <option value="manual">Manual Login / Guest</option>
                            </select>

                            {selectedAccountId === 'manual' && preferences.tcgplayerEmail && (
                                <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Using deprecated credentials from localStorage fallback.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded text-sm text-blue-200">
                    <p className="flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                            Automation uses <strong>Direct Selection Mode</strong>. It will navigate to each product page and select the specific seller listing to ensure your optimized price is respected.
                        </span>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-purple-500/25 flex items-center gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Launch Automation
                    </button>
                </div>
            </div>
        </Modal>
    );
};
