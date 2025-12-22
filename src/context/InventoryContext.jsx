/**
 * Inventory Context for managing inventory state and operations
 * Reduces prop drilling by providing inventory-related state and functions via context
 * @module context/InventoryContext
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../hooks/useApi';
import { useToast, TOAST_TYPES } from './ToastContext';
import { useUndoSafe, UNDO_ACTION_TYPES } from './UndoContext';

const InventoryContext = createContext(null);

/**
 * InventoryProvider component that wraps the application
 * and provides inventory state and operations
 */
export function InventoryProvider({ children }) {
  const { get, post, put, del } = useApi();
  const { showToast } = useToast();
  const undoContext = useUndoSafe();

  const [inventory, setInventory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  /**
   * Load all inventory items from the API
   */
  const loadInventory = useCallback(async (options = {}) => {
    const { silentError = false } = options;
    try {
      const data = await get('/inventory');
      const sortedData = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setInventory(sortedData);
    } catch (error) {
      console.error('[INVENTORY] Failed to load inventory:', error);
      if (!silentError) {
        showToast('Failed to load inventory. Please refresh the page.', TOAST_TYPES.ERROR);
      }
      setInventory([]);
    }
  }, [get, showToast]);

  /**
   * Add a new inventory item
   * @param {Object} item - Item data to add
   * @param {Object} options - Optional configuration
   * @param {boolean} options.silent - If true, suppress success toast (for bulk operations)
   * @returns {Promise<boolean>} Whether the add was successful
   */
  const addInventoryItem = useCallback(async (item, options = {}) => {
    const { silent = false } = options;
    try {
      await post('/inventory', item);
      await loadInventory(); // Refresh to get real data
      if (!silent) {
        showToast('Card added successfully!', TOAST_TYPES.SUCCESS);
      }
      return true;
    } catch (error) {
      showToast('Error adding card: ' + error.message, TOAST_TYPES.ERROR);
      return false;
    }
  }, [post, loadInventory, showToast]);

  /**
   * Update an existing inventory item
   * @param {number} id - Item ID to update
   * @param {Object} updates - Fields to update
   */
  const updateInventoryItem = useCallback(async (id, updates) => {
    // Find the item to get its previous state for undo
    const item = inventory.find(i => i.id === id);
    const previousState = item ? { ...item } : null;
    const itemName = item?.name || 'Card';

    try {
      // Add last_modified timestamp to track changes
      const updateWithTimestamp = {
        ...updates,
        last_modified: new Date().toISOString(),
      };
      await put(`/inventory/${id}`, updateWithTimestamp);
      await loadInventory();
      setEditingId(null);

      // Register undo action if undo context is available
      if (undoContext?.registerAction && previousState) {
        undoContext.registerAction({
          type: UNDO_ACTION_TYPES.UPDATE_ITEM,
          description: `Updated ${itemName}`,
          data: { id, updates, previousState, itemName },
          undoFn: async () => {
            // Restore previous state
            const restoreData = {
              quantity: previousState.quantity,
              purchase_price: previousState.purchase_price,
              folder: previousState.folder,
              reorder_type: previousState.reorder_type,
              last_modified: new Date().toISOString(),
            };
            await put(`/inventory/${id}`, restoreData);
            await loadInventory();
          },
          redoFn: async () => {
            // Generate fresh timestamp for redo to avoid stale timestamps
            const redoData = {
              ...updates,
              last_modified: new Date().toISOString(),
            };
            await put(`/inventory/${id}`, redoData);
            await loadInventory();
          },
        });
      } else {
        showToast('Card updated!', TOAST_TYPES.SUCCESS);
      }
    } catch (_error) {
      // No rollback needed - loadInventory() is called on success to refresh state
      // On error, the server state is unchanged
      showToast('Error updating card', TOAST_TYPES.ERROR);
    }
  }, [put, loadInventory, showToast, inventory, undoContext]);

  /**
   * Soft delete - moves item to Trash folder
   * @param {number} id - Item ID to delete
   */
  const deleteInventoryItem = useCallback(async (id) => {
    // Find the item to get its details for undo
    const item = inventory.find(i => i.id === id);
    const previousFolder = item?.folder || 'Uncategorized';
    const itemName = item?.name || 'Card';

    try {
      await put(`/inventory/${id}`, { folder: 'Trash' });
      await loadInventory();

      // Register undo action if undo context is available
      if (undoContext?.registerAction) {
        undoContext.registerAction({
          type: UNDO_ACTION_TYPES.DELETE_ITEM,
          description: `Deleted ${itemName}`,
          data: { id, previousFolder, itemName },
          undoFn: async () => {
            await put(`/inventory/${id}`, { folder: previousFolder });
            await loadInventory();
          },
          redoFn: async () => {
            await put(`/inventory/${id}`, { folder: 'Trash' });
            await loadInventory();
          },
        });
      } else {
        showToast('Card moved to Trash', TOAST_TYPES.SUCCESS);
      }
    } catch (_error) {
      showToast('Failed to delete card', TOAST_TYPES.ERROR);
    }
  }, [put, loadInventory, showToast, inventory, undoContext]);

  /**
   * Permanently delete - actually removes the item from database
   * @param {number} id - Item ID to permanently delete
   */
  const permanentlyDeleteItem = useCallback(async (id) => {
    try {
      await del(`/inventory/${id}`);
      await loadInventory();
      showToast('Card permanently deleted', TOAST_TYPES.SUCCESS);
    } catch (_error) {
      showToast('Failed to delete card', TOAST_TYPES.ERROR);
    }
  }, [del, loadInventory, showToast]);

  /**
   * Restore item from Trash to Uncategorized
   * @param {number} id - Item ID to restore
   */
  const restoreFromTrash = useCallback(async (id) => {
    // Find the item to get its name for the undo message
    const item = inventory.find(i => i.id === id);
    const itemName = item?.name || 'Card';

    try {
      await put(`/inventory/${id}`, { folder: 'Uncategorized' });
      await loadInventory();

      // Register undo action if undo context is available
      if (undoContext?.registerAction) {
        undoContext.registerAction({
          type: UNDO_ACTION_TYPES.RESTORE_ITEM,
          description: `Restored ${itemName}`,
          data: { id, itemName },
          undoFn: async () => {
            // Move back to Trash
            await put(`/inventory/${id}`, { folder: 'Trash' });
            await loadInventory();
          },
          redoFn: async () => {
            await put(`/inventory/${id}`, { folder: 'Uncategorized' });
            await loadInventory();
          },
        });
      } else {
        showToast('Card restored from Trash', TOAST_TYPES.SUCCESS);
      }
    } catch (_error) {
      showToast('Failed to restore card', TOAST_TYPES.ERROR);
    }
  }, [put, loadInventory, showToast, inventory, undoContext]);

  /**
   * Empty entire Trash folder - permanently deletes all trash items
   */
  const emptyTrash = useCallback(async () => {
    try {
      await del('/inventory/trash');
      await loadInventory();
      showToast('Trash emptied', TOAST_TYPES.SUCCESS);
    } catch (_error) {
      showToast('Failed to empty trash', TOAST_TYPES.ERROR);
    }
  }, [del, loadInventory, showToast]);

  /**
   * Start editing an inventory item
   * @param {Object} item - Item to edit
   */
  const startEditingItem = useCallback((item) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity,
      purchase_price: item.purchase_price || '',
      folder: item.folder || 'Uncategorized',
      reorder_type: item.reorder_type || 'normal',
    });
  }, []);

  const value = useMemo(() => ({
    inventory,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    permanentlyDeleteItem,
    restoreFromTrash,
    emptyTrash,
    editingId,
    setEditingId,
    editForm,
    setEditForm,
    startEditingItem,
  }), [
    inventory,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    permanentlyDeleteItem,
    restoreFromTrash,
    emptyTrash,
    editingId,
    editForm,
    startEditingItem,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

InventoryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to access inventory functionality
 * @returns {Object} Inventory context value
 */
export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}

export default InventoryContext;
