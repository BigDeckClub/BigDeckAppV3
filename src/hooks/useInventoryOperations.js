/**
 * Inventory operations hook for handling CRUD operations on inventory
 * @module hooks/useInventoryOperations
 */

import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

/**
 * @typedef {Object} InventoryItem
 * @property {number} id - Unique identifier
 * @property {string} name - Card name
 * @property {string} set - Set code
 * @property {string} [set_name] - Full set name
 * @property {number} quantity - Number of copies
 * @property {string} [purchase_date] - Date of purchase
 * @property {number} [purchase_price] - Purchase price
 * @property {string} [reorder_type] - Reorder type (normal, foil, etc.)
 * @property {string} [image_url] - Card image URL
 * @property {string} [folder] - Folder/category
 * @property {boolean} [low_inventory_alert] - Low inventory alert flag
 * @property {string} [last_modified] - Last modification timestamp
 */

/**
 * @typedef {Object} UseInventoryOperationsResult
 * @property {InventoryItem[]} inventory - Current inventory items
 * @property {function(): Promise<void>} loadInventory - Fetch all inventory items
 * @property {function(Object): Promise<boolean>} addInventoryItem - Add a new item
 * @property {function(number, Object): Promise<void>} updateInventoryItem - Update an item
 * @property {function(number): Promise<void>} deleteInventoryItem - Soft delete (move to Trash)
 * @property {function(number): Promise<void>} permanentlyDeleteItem - Permanently delete an item
 * @property {function(number): Promise<void>} restoreFromTrash - Restore item from Trash
 * @property {function(): Promise<void>} emptyTrash - Empty all items in Trash
 * @property {number|null} editingId - ID of item currently being edited
 * @property {function(number|null): void} setEditingId - Set the editing item ID
 * @property {Object} editForm - Current edit form state
 * @property {function(Object): void} setEditForm - Update edit form state
 * @property {function(InventoryItem): void} startEditingItem - Start editing an item
 */

/**
 * Custom hook for inventory CRUD operations
 * Handles loading, adding, updating, and deleting inventory items
 * 
 * @returns {UseInventoryOperationsResult}
 */
export function useInventoryOperations() {
  const { get, post, put, del } = useApi();
  const { showToast } = useToast();

  const [inventory, setInventory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  /**
   * Load all inventory items from the API
   */
  const loadInventory = useCallback(async () => {
    try {
      const data = await get('/inventory');
      const sortedData = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setInventory(sortedData);
    } catch (error) {
      setInventory([]);
    }
  }, [get]);

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
      showToast('Error adding card: ' + error.message, TOAST_TYPES.ERROR, {
        action: { label: 'Retry', onClick: () => addInventoryItem(item, options) }
      });
      return false;
    }
  }, [post, loadInventory, showToast]);

  /**
   * Update an existing inventory item
   * @param {number} id - Item ID to update
   * @param {Object} updates - Fields to update
   */
  const updateInventoryItem = useCallback(async (id, updates) => {
    const previousInventory = [...inventory];
    try {
      // Add last_modified timestamp to track changes
      const updateWithTimestamp = {
        ...updates,
        last_modified: new Date().toISOString(),
      };
      await put(`/inventory/${id}`, updateWithTimestamp);
      await loadInventory();
      setEditingId(null);
      showToast('Card updated!', TOAST_TYPES.SUCCESS);
    } catch (error) {
      // Rollback on error
      setInventory(previousInventory);
      showToast('Error updating card', TOAST_TYPES.ERROR, {
        action: { label: 'Retry', onClick: () => updateInventoryItem(id, updates) }
      });
    }
  }, [put, loadInventory, showToast, inventory]);

  /**
   * Soft delete - moves item to Trash folder
   * @param {number} id - Item ID to delete
   */
  const deleteInventoryItem = useCallback(async (id) => {
    try {
      await put(`/inventory/${id}`, { folder: 'Trash' });
      await loadInventory();
      showToast('Card moved to Trash', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast('Failed to delete card', TOAST_TYPES.ERROR);
    }
  }, [put, loadInventory, showToast]);

  /**
   * Permanently delete - actually removes the item from database
   * @param {number} id - Item ID to permanently delete
   */
  const permanentlyDeleteItem = useCallback(async (id) => {
    try {
      await del(`/inventory/${id}`);
      await loadInventory();
      showToast('Card permanently deleted', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast('Failed to delete card', TOAST_TYPES.ERROR);
    }
  }, [del, loadInventory, showToast]);

  /**
   * Restore item from Trash to Uncategorized
   * @param {number} id - Item ID to restore
   */
  const restoreFromTrash = useCallback(async (id) => {
    try {
      await put(`/inventory/${id}`, { folder: 'Uncategorized' });
      await loadInventory();
      showToast('Card restored from Trash', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast('Failed to restore card', TOAST_TYPES.ERROR);
    }
  }, [put, loadInventory, showToast]);

  /**
   * Empty entire Trash folder - permanently deletes all trash items
   */
  const emptyTrash = useCallback(async () => {
    try {
      await del('/inventory/trash');
      await loadInventory();
      showToast('Trash emptied', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast('Failed to empty trash', TOAST_TYPES.ERROR);
    }
  }, [del, loadInventory, showToast]);

  /**
   * Start editing an inventory item
   * @param {InventoryItem} item - Item to edit
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

  return {
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
  };
}

export default useInventoryOperations;