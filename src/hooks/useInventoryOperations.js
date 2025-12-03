/**
 * Inventory operations hook for handling CRUD operations on inventory
 * @module hooks/useInventoryOperations
 */

import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { API_BASE } from '../config/api';

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
 * @property {function(number): Promise<void>} deleteInventoryItem - Delete an item
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
  const { get, post, put } = useApi();
  const { showToast } = useToast();

  const [inventory, setInventory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  /**
   * Load all inventory items from the API
   */
  const loadInventory = useCallback(async () => {
    console.log('=== LOAD INVENTORY CALLED ===');
    try {
      const data = await get(`${API_BASE}/inventory`);
      const sortedData = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      console.log('Inventory loaded, total items:', sortedData.length);
      
      // Check item 6's alert status
      const item6 = sortedData.find(i => i.id === 6);
      console.log('Item 6 low_inventory_alert:', item6?.low_inventory_alert);
      
      setInventory(sortedData);
      console.log('setInventory called - state updated');
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    }
  }, [get]);

  /**
   * Add a new inventory item
   * @param {Object} item - Item data to add
   * @returns {Promise<boolean>} Whether the add was successful
   */
  const addInventoryItem = useCallback(async (item) => {
    try {
      await post(`${API_BASE}/inventory`, item);
      await loadInventory(); // Refresh to get real data
      showToast('Card added successfully!', TOAST_TYPES.SUCCESS);
      return true;
    } catch (error) {
      showToast('Error adding card: ' + error.message, TOAST_TYPES.ERROR, {
        action: { label: 'Retry', onClick: () => addInventoryItem(item) }
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
      await put(`${API_BASE}/inventory/${id}`, updateWithTimestamp);
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
   * Delete an inventory item (moves to Uncategorized folder)
   * @param {number} id - Item ID to delete
   */
  const deleteInventoryItem = useCallback(async (id) => {
    try {
      await put(`${API_BASE}/inventory/${id}`, { folder: 'Uncategorized' });
      await loadInventory();
    } catch (error) {
      // Silently fail as per original implementation
    }
  }, [put, loadInventory]);

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
    setInventory,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    editingId,
    setEditingId,
    editForm,
    setEditForm,
    startEditingItem,
  };
}

export default useInventoryOperations;
