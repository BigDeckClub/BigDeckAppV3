import React, { useState } from 'react';
import { Modal, Button, Input } from './ui';

/**
 * SellModal - Modal dialog for recording item sales
 * Refactored to use shared UI components
 */
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

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Purchase Price (Cost)</label>
          <div className="text-white font-semibold bg-slate-700 p-3 rounded-lg">${purchasePrice.toFixed(2)}</div>
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
