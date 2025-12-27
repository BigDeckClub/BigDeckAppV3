/**
 * Centralized PropTypes definitions for data models
 * Single source of truth for all type shapes across the application
 */

import PropTypes from 'prop-types';

/**
 * Card Set - Can be either a string (set code) or an object (full set info)
 * This handles the mixed data format mentioned in CLAUDE.md
 */
export const CardSetShape = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.shape({
    editionname: PropTypes.string,
    editioncode: PropTypes.string,
    mtgoCode: PropTypes.string,
    editiondate: PropTypes.string,
    editiontype: PropTypes.string
  })
]);

/**
 * Card - Represents a single MTG card
 */
export const CardShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string.isRequired,
  set: CardSetShape,
  set_name: PropTypes.string,
  quantity: PropTypes.number,
  purchase_price: PropTypes.number,
  purchase_date: PropTypes.string,
  folder: PropTypes.string,
  foil: PropTypes.bool,
  quality: PropTypes.string,
  reserved_quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  low_inventory_alert: PropTypes.bool,
  low_inventory_threshold: PropTypes.number,
  scryfall_id: PropTypes.string,
  image_uris: PropTypes.object,
  card_faces: PropTypes.array
});

/**
 * Deck Card - Card as it appears in a deck
 */
export const DeckCardShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  quantity: PropTypes.number.isRequired,
  type_line: PropTypes.string,
  mana_cost: PropTypes.string,
  cmc: PropTypes.number,
  colors: PropTypes.arrayOf(PropTypes.string),
  color_identity: PropTypes.arrayOf(PropTypes.string)
});

/**
 * Deck - Represents a deck
 */
export const DeckShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
  format: PropTypes.string,
  commander: PropTypes.string,
  cards: PropTypes.arrayOf(DeckCardShape),
  reserved_count: PropTypes.number,
  total_cost: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
  user_id: PropTypes.string
});

/**
 * Folder - Represents an inventory folder
 */
export const FolderShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  cards: PropTypes.arrayOf(CardShape),
  totalCards: PropTypes.number,
  uniqueCards: PropTypes.number,
  totalValue: PropTypes.number
});

/**
 * User - Basic user info
 */
export const UserShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  email: PropTypes.string,
  created_at: PropTypes.string
});

/**
 * Import Record - Represents a bulk import
 */
export const ImportShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  card_list: PropTypes.string,
  source: PropTypes.oneOf(['wholesale', 'tcgplayer', 'cardkingdom', 'local', 'other']),
  status: PropTypes.oneOf(['pending', 'processing', 'completed', 'cancelled']),
  created_at: PropTypes.string,
  updated_at: PropTypes.string
});

/**
 * Price Data - Card pricing information
 */
export const PriceShape = PropTypes.shape({
  usd: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  usd_foil: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  eur: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  tix: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
});

/**
 * Threshold Settings - Low inventory threshold configuration
 */
export const ThresholdSettingsShape = PropTypes.shape({
  baseStock: PropTypes.number.isRequired,
  landMultiplier: PropTypes.number.isRequired,
  velocityWeeks: PropTypes.number.isRequired
});

/**
 * Analytics/Metrics - Dashboard metrics
 */
export const MetricsShape = PropTypes.shape({
  totalCards: PropTypes.number,
  totalAvailable: PropTypes.number,
  uniqueCards: PropTypes.number,
  totalValue: PropTypes.number
});

/**
 * Folder Operations - Props for folder CRUD operations
 */
export const FolderOperationsShape = PropTypes.shape({
  folderMetadata: PropTypes.object,
  editingFolderName: PropTypes.string,
  setEditingFolderName: PropTypes.func,
  editingFolderDesc: PropTypes.string,
  setEditingFolderDesc: PropTypes.func,
  setFolderMetadata: PropTypes.func,
  createdFolders: PropTypes.array,
  moveInventoryItemToFolder: PropTypes.func
});

/**
 * Common Props - Frequently used prop combinations
 */
export const CommonCallbackProps = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  onCancel: PropTypes.func,
  onClose: PropTypes.func
};

export const CommonEditProps = {
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editForm: PropTypes.object,
  setEditForm: PropTypes.func,
  setEditingId: PropTypes.func,
  startEditingItem: PropTypes.func,
  updateInventoryItem: PropTypes.func,
  deleteInventoryItem: PropTypes.func
};

export const CommonViewProps = {
  viewMode: PropTypes.oneOf(['list', 'card', 'image']),
  sortField: PropTypes.oneOf(['name', 'price', 'quantity', 'set', 'dateAdded']),
  sortDirection: PropTypes.oneOf(['asc', 'desc'])
};

/**
 * Helper function to get set display name from mixed format
 * Handles both string and object set formats safely
 */
export function getSetDisplayName(set) {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  return set.editionname || set.editioncode || 'Unknown';
}

/**
 * Helper function to get set code from mixed format
 */
export function getSetCode(set) {
  if (!set) return null;
  if (typeof set === 'string') return set;
  return set.editioncode || set.mtgoCode || null;
}
