import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { CardGroup } from './CardGroup';

/**
 * CardGrid - Renders a grid or list of CardGroup components
 * Handles both card and list view modes
 */
export const CardGrid = memo(function CardGrid({
  cards,
  viewMode,
  expandedCards,
  setExpandedCards,
  editingId,
  editForm,
  setEditForm,
  startEditingItem,
  updateInventoryItem,
  deleteInventoryItem,
  permanentlyDeleteItem,
  restoreFromTrash,
  isTrashView,
  createdFolders,
  onToggleLowInventory,
  onSetThreshold,
  selectedCardIds,
  setSelectedCardIds
}) {
  if (cards.length === 0) {
    return null;
  }

  if (viewMode === 'card') {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
        {cards.map(([cardName, items]) => (
          <CardGroup
            key={cardName}
            cardName={cardName}
            items={items}
            viewMode={viewMode}
            expandedCards={expandedCards}
            setExpandedCards={setExpandedCards}
            editingId={editingId}
            editForm={editForm}
            setEditForm={setEditForm}
            startEditingItem={startEditingItem}
            updateInventoryItem={updateInventoryItem}
            deleteInventoryItem={deleteInventoryItem}
            permanentlyDeleteItem={permanentlyDeleteItem}
            restoreFromTrash={restoreFromTrash}
            isTrashView={isTrashView}
            createdFolders={createdFolders}
            onToggleLowInventory={onToggleLowInventory}
            onSetThreshold={onSetThreshold}
            selectedCardIds={selectedCardIds}
            setSelectedCardIds={setSelectedCardIds}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map(([cardName, items]) => (
        <CardGroup
          key={cardName}
          cardName={cardName}
          items={items}
          viewMode={viewMode}
          expandedCards={expandedCards}
          setExpandedCards={setExpandedCards}
          editingId={editingId}
          editForm={editForm}
          setEditForm={setEditForm}
          startEditingItem={startEditingItem}
          updateInventoryItem={updateInventoryItem}
          deleteInventoryItem={deleteInventoryItem}
          permanentlyDeleteItem={permanentlyDeleteItem}
          restoreFromTrash={restoreFromTrash}
          isTrashView={isTrashView}
          createdFolders={createdFolders}
          onToggleLowInventory={onToggleLowInventory}
          onSetThreshold={onSetThreshold}
          selectedCardIds={selectedCardIds}
          setSelectedCardIds={setSelectedCardIds}
        />
      ))}
    </div>
  );
});

CardGrid.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.array).isRequired,
  viewMode: PropTypes.string.isRequired,
  expandedCards: PropTypes.object.isRequired,
  setExpandedCards: PropTypes.func.isRequired,
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  startEditingItem: PropTypes.func.isRequired,
  updateInventoryItem: PropTypes.func.isRequired,
  deleteInventoryItem: PropTypes.func.isRequired,
  permanentlyDeleteItem: PropTypes.func,
  restoreFromTrash: PropTypes.func,
  isTrashView: PropTypes.bool,
  createdFolders: PropTypes.array.isRequired,
  onToggleLowInventory: PropTypes.func,
  onSetThreshold: PropTypes.func,
  selectedCardIds: PropTypes.instanceOf(Set),
  setSelectedCardIds: PropTypes.func
};

export default CardGrid;
