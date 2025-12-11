import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

export const SellModal = ({ isOpen, itemName, purchasePrice, onClose, onSell, itemType, deckId, quantity = 1 }) => {
  const [sellPrice, setSellPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { showToast } = useToast();

  const handleSell = async () => {
    // Clear previous validation error
    setValidationError('');
    
    if (!sellPrice || isNaN(sellPrice) || parseFloat(sellPrice) < 0) {
      setValidationError('Please enter a valid sell price');
      return;
    }

    setIsLoading(true);
    try {
      await onSell({
        itemType,
        itemId: deckId || null,
        itemName,
        purchasePrice: parseFloat(purchasePrice),
        sellPrice: parseFloat(sellPrice),
        quantity: parseInt(quantity, 10) // Ensure quantity is a number, not a string
      });
      setSellPrice('');
      onClose();
    } catch (error) {
      showToast('Failed to record sale', TOAST_TYPES.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellPriceChange = (e) => {
    setSellPrice(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  if (!isOpen) return null;

  const profit = sellPrice ? (parseFloat(sellPrice) - purchasePrice).toFixed(2) : '0.00';
  const profitClass = profit >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Sell {itemType === 'deck' ? 'Deck' : 'Folder'}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Item</label>
            <div className="text-white font-semibold bg-[var(--muted-surface)] p-2 rounded flex items-center justify-between">
              <span>{itemName}</span>
              {quantity > 1 && (
                <span className="flex items-center gap-1 text-teal-400 text-sm">
                  <Package className="w-4 h-4" />
                  {quantity} cards
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Purchase Price (Cost)</label>
            <div className="text-white font-semibold bg-[var(--muted-surface)] p-2 rounded">${purchasePrice.toFixed(2)}</div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Sell Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellPrice}
              onChange={handleSellPriceChange}
              placeholder="Enter sell price"
              className={`w-full px-3 py-2 bg-[var(--muted-surface)] border rounded text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 ${
                validationError ? 'border-red-500' : 'border-[var(--border)]'
              }`}
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-400">{validationError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Profit</label>
            <div className={`text-lg font-bold p-2 rounded bg-[var(--muted-surface)] ${profitClass}`}>
              ${profit}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[var(--muted-surface)] hover:bg-slate-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSell}
              disabled={isLoading || !sellPrice}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Selling...' : 'Confirm Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
