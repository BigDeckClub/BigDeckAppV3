import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

/**
 * SellModal - Modal dialog for recording item sales
 * Refactored to use shared UI components
 */
export const SellModal = ({ isOpen, itemName, purchasePrice, onClose, onSell, itemType, deckId }) => {
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
        quantity: 1
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sell ${itemType === 'deck' ? 'Deck' : 'Folder'}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSell}
            loading={isLoading}
            disabled={!sellPrice}
          >
            {isLoading ? 'Selling...' : 'Confirm Sale'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Item</label>
          <div className="text-white font-semibold bg-slate-700 p-3 rounded-lg">{itemName}</div>
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
              onChange={handleSellPriceChange}
              placeholder="Enter sell price"
              className={`w-full px-3 py-2 bg-slate-700 border rounded text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 ${
                validationError ? 'border-red-500' : 'border-slate-600'
              }`}
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-400">{validationError}</p>
            )}
          </div>

        <Input
          label="Sell Price"
          type="number"
          step="0.01"
          min="0"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          placeholder="Enter sell price"
        />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Profit</label>
          <div className={`text-lg font-bold p-3 rounded-lg bg-slate-700 ${profitClass}`}>
            ${profit}
          </div>
        </div>
      </div>
    </Modal>
  );
};
