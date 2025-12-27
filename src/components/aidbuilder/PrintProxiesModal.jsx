/**
 * Print Proxies Modal
 * Modal for selecting and printing proxy cards
 */

import React from 'react';
import PropTypes from 'prop-types';
import { X, Printer } from 'lucide-react';
import Button from '../ui/Button';
import { usePrintProxies } from '../../hooks/usePrintProxies';

export default function PrintProxiesModal({ isOpen, onClose, deckCards }) {
  const { printProxies, calculatePrintCost } = usePrintProxies();

  if (!isOpen) return null;

  const handlePrint = async (mode) => {
    try {
      await printProxies(deckCards, mode);
      onClose();
    } catch (error) {
      // Error already handled by hook
      console.error('Print failed', error);
    }
  };

  // Calculate costs for each mode
  const allCost = calculatePrintCost(deckCards, 'all');
  const missingCost = calculatePrintCost(deckCards, 'missing');
  const unavailableCost = calculatePrintCost(deckCards, 'unavailable');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-ui-primary border border-ui-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ui-border">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Printer className="w-6 h-6" />
            Print Proxy Cards
          </h2>
          <button
            onClick={onClose}
            className="text-ui-muted hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> Proxy cards are for playtesting purposes only.
              Always check with your playgroup before using proxies in games.
            </p>
          </div>

          {/* Print Options */}
          <div className="space-y-3">
            {/* Print All */}
            <div className="bg-ui-secondary border border-ui-border rounded-lg p-4 hover:border-ui-accent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Print All Cards
                  </h3>
                  <p className="text-sm text-ui-muted">
                    Print the entire {allCost.cardCount}-card deck, including cards you already own.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-ui-muted">Cost: </span>
                  <span className="text-white font-medium">
                    ${allCost.totalCost.toFixed(2)}
                  </span>
                  <span className="text-ui-muted ml-1">
                    ({allCost.cardCount} cards)
                  </span>
                </div>
                <Button
                  onClick={() => handlePrint('all')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print All
                </Button>
              </div>
            </div>

            {/* Print Missing */}
            <div className="bg-ui-secondary border border-ui-border rounded-lg p-4 hover:border-ui-accent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Print Missing Cards
                  </h3>
                  <p className="text-sm text-ui-muted">
                    Print only cards you don't own at all (never purchased).
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-ui-muted">Cost: </span>
                  <span className="text-white font-medium">
                    ${missingCost.totalCost.toFixed(2)}
                  </span>
                  <span className="text-ui-muted ml-1">
                    ({missingCost.cardCount} cards)
                  </span>
                </div>
                <Button
                  onClick={() => handlePrint('missing')}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={missingCost.cardCount === 0}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Missing
                </Button>
              </div>
            </div>

            {/* Print Unavailable */}
            <div className="bg-ui-secondary border border-ui-border rounded-lg p-4 hover:border-ui-accent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Print Unavailable Cards
                    <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  </h3>
                  <p className="text-sm text-ui-muted">
                    Print cards that are missing OR reserved in other decks.
                    Perfect for building this deck while keeping others intact.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-ui-muted">Cost: </span>
                  <span className="text-white font-medium">
                    ${unavailableCost.totalCost.toFixed(2)}
                  </span>
                  <span className="text-ui-muted ml-1">
                    ({unavailableCost.cardCount} cards)
                  </span>
                </div>
                <Button
                  onClick={() => handlePrint('unavailable')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={unavailableCost.cardCount === 0}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Unavailable
                </Button>
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-ui-tertiary border border-ui-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Pricing</h4>
            <ul className="text-sm text-ui-muted space-y-1">
              <li>• $0.25 per card (high-quality cardstock)</li>
              <li>• Free shipping on orders over 50 cards</li>
              <li>• Cards printed on 310gsm cardstock</li>
              <li>• Average delivery: 5-7 business days</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-ui-border flex justify-end">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

PrintProxiesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  deckCards: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      quantity: PropTypes.number,
      category: PropTypes.string
    })
  ).isRequired
};
