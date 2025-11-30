import React, { useState } from 'react';
import { X } from 'lucide-react';

export const SellModal = ({ isOpen, itemName, purchasePrice, onClose, onSell, itemType, deckId }) => {
  const [sellPrice, setSellPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSell = async () => {
    if (!sellPrice || isNaN(sellPrice) || parseFloat(sellPrice) < 0) {
      alert('Please enter a valid sell price');
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
        quantity: 1
      });
      setSellPrice('');
      onClose();
    } catch (error) {
      alert('Failed to record sale');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const profit = sellPrice ? (parseFloat(sellPrice) - purchasePrice).toFixed(2) : '0.00';
  const profitClass = profit >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Sell {itemType === 'deck' ? 'Deck' : 'Folder'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Item</label>
            <div className="text-white font-semibold bg-slate-700 p-2 rounded">{itemName}</div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Purchase Price (Cost)</label>
            <div className="text-white font-semibold bg-slate-700 p-2 rounded">${purchasePrice.toFixed(2)}</div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Sell Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="Enter sell price"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Profit</label>
            <div className={`text-lg font-bold p-2 rounded bg-slate-700 ${profitClass}`}>
              ${profit}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
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
