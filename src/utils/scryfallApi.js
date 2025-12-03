import { EXTERNAL_APIS } from '../config/api';

export const searchCards = async (query) => {
  const response = await fetch(
    `${EXTERNAL_APIS.SCRYFALL}/cards/search?q=${encodeURIComponent(query)}&unique=prints`
  );
  if (!response.ok) return { data: [] };
  return response.json();
};

export const getAllSets = async () => {
  const response = await fetch(`${EXTERNAL_APIS.SCRYFALL}/sets`);
  if (!response.ok) return { data: [] };
  const data = await response.json();
  return data.data
    .filter(set => set.set_type !== 'token' && set.set_type !== 'memorabilia')
    .map(set => ({ code: set.code.toUpperCase(), name: set.name }));
};
