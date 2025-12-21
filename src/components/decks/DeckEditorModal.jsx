import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Trash2, Search, Save } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';

/**
 * DeckEditorModal - Modal for manually editing deck cards
 * Allows adding/removing cards and adjusting quantities
 */
export function DeckEditorModal({ deck, onClose, onSave }) {
  const { showToast } = useToast();
  const [editedCards, setEditedCards] = useState([...(deck.cards || [])]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardQuantity, setNewCardQuantity] = useState(1);
  const [newCardSet, setNewCardSet] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter cards by search term
  const filteredCards = useMemo(() => {
    if (!searchTerm) return editedCards;
    const term = searchTerm.toLowerCase();
    return editedCards.filter(card =>
      card.name?.toLowerCase().includes(term)
    );
  }, [editedCards, searchTerm]);

  // Handle quantity change
  const handleQuantityChange = (index, newQuantity) => {
    const qty = parseInt(newQuantity) || 0;
    if (qty < 1) return;

    const updated = [...editedCards];
    updated[index] = { ...updated[index], quantity: qty };
    setEditedCards(updated);
  };

  // Handle card removal
  const handleRemoveCard = (index) => {
    setEditedCards(editedCards.filter((_, i) => i !== index));
  };

  // Handle adding new card
  const handleAddCard = () => {
    if (!newCardName.trim()) {
      showToast('Please enter a card name', TOAST_TYPES.WARNING);
      return;
    }

    const newCard = {
      name: newCardName.trim(),
      quantity: Math.max(1, newCardQuantity),
      set: newCardSet.trim() || undefined
    };

    setEditedCards([...editedCards, newCard]);
    setNewCardName('');
    setNewCardQuantity(1);
    setNewCardSet('');
    showToast(`Added ${newCard.quantity}x ${newCard.name}`, TOAST_TYPES.SUCCESS);
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedCards);
      showToast('Deck updated successfully', TOAST_TYPES.SUCCESS);
      onClose();
    } catch (error) {
      showToast(`Failed to save deck: ${error.message}`, TOAST_TYPES.ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCards = editedCards.reduce((sum, card) => sum + (card.quantity || 1), 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--bda-primary)]">Edit Deck: {deck.name}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {totalCards} cards • {editedCards.length} unique
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add New Card Section */}
          <div className="bg-[var(--bg-page)] rounded-lg border border-[var(--border)] p-4">
            <h3 className="text-sm font-semibold text-[var(--bda-primary)] mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Card
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Card Name"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
                className="md:col-span-2 px-3 py-2 bg-[var(--muted-surface)] border border-[var(--border)] rounded text-[var(--bda-text)] placeholder-[var(--bda-muted)] focus:outline-none focus:border-[var(--bda-primary)]"
              />
              <input
                type="number"
                placeholder="Quantity"
                min="1"
                value={newCardQuantity}
                onChange={(e) => setNewCardQuantity(parseInt(e.target.value) || 1)}
                className="px-3 py-2 bg-[var(--muted-surface)] border border-[var(--border)] rounded text-[var(--bda-text)] placeholder-[var(--bda-muted)] focus:outline-none focus:border-[var(--bda-primary)]"
              />
              <input
                type="text"
                placeholder="Set (optional)"
                value={newCardSet}
                onChange={(e) => setNewCardSet(e.target.value)}
                className="px-3 py-2 bg-[var(--muted-surface)] border border-[var(--border)] rounded text-[var(--bda-text)] placeholder-[var(--bda-muted)] focus:outline-none focus:border-[var(--bda-primary)]"
              />
            </div>
            <button
              onClick={handleAddCard}
              className="mt-2 w-full px-4 py-2 bg-[var(--bda-primary)] hover:opacity-90 text-[var(--bda-primary-foreground)] rounded-lg transition-colors font-semibold"
            >
              Add to Deck
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search cards in deck..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--muted-surface)] border border-[var(--border)] rounded text-[var(--bda-text)] placeholder-[var(--bda-muted)] focus:outline-none focus:border-[var(--bda-primary)]"
            />
          </div>

          {/* Cards List */}
          <div className="space-y-2">
            {filteredCards.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-8">
                {searchTerm ? 'No matching cards found' : 'No cards in deck'}
              </p>
            ) : (
              filteredCards.map((card, index) => (
                <div
                  key={index}
                  className="bg-[var(--bg-page)] rounded-lg border border-[var(--border)] p-3 flex items-center gap-3"
                >
                  <input
                    type="number"
                    min="1"
                    value={card.quantity || 1}
                    onChange={(e) => handleQuantityChange(
                      editedCards.findIndex(c => c === card),
                      e.target.value
                    )}
                    className="w-16 px-2 py-1 bg-[var(--muted-surface)] border border-[var(--border)] rounded text-[var(--bda-text)] text-center focus:outline-none focus:border-[var(--bda-primary)]"
                  />
                  <div className="flex-1">
                    <div className="text-slate-100 font-medium">{card.name}</div>
                    {card.set && (
                      <div className="text-xs text-[var(--text-muted)]">{card.set}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveCard(editedCards.findIndex(c => c === card))}
                    className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    title="Remove from deck"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--muted-surface)] hover:bg-slate-600 text-white rounded-lg transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[var(--bda-primary)] hover:opacity-90 disabled:bg-[var(--muted-surface)] disabled:text-[var(--text-muted)] text-[var(--bda-primary-foreground)] rounded-lg transition-colors font-semibold flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

DeckEditorModal.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      quantity: PropTypes.number,
      set: PropTypes.string
    }))
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default DeckEditorModal;
