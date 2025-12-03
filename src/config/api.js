export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const EXTERNAL_APIS = {
  SCRYFALL: 'https://api.scryfall.com',
  ARCHIDEKT: 'https://api.archidekt.com/v1',
};

export const API_ENDPOINTS = {
  INVENTORY: '/inventory',
  DECKS: '/decks',
  DECK_INSTANCES: '/deck-instances',
  FOLDERS: '/folders',
  SALES: '/sales',
  SETTINGS: '/settings',
  IMPORTS: '/imports',
  AUTH: '/auth',
};
