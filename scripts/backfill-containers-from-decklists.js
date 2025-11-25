import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseDecklistTextToCards(deckText) {
  if (!deckText || typeof deckText !== "string") return [];
  const lines = deckText.split(/\r?\n/);
  const cards = [];
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const qtyNameMatch = line.match(/^\s*(\d+)\s+(.+)$/);
    let qty = 1;
    let rest = line;
    if (qtyNameMatch) {
      qty = parseInt(qtyNameMatch[1], 10) || 1;
      rest = qtyNameMatch[2].trim();
    }
    let name = rest;
    let set = "";
    const parenMatch = rest.match(/^(.*?)\s*\(\s*([^)]+)\s*\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      set = parenMatch[2].trim();
    } else {
      const sepMatch = rest.match(/^(.*?)\s*(?:[-|]\s*)([A-Za-z0-9]+)\s*$/);
      if (sepMatch) {
        name = sepMatch[1].trim();
        set = sepMatch[2].trim();
      } else {
        const trailingSetMatch = rest.match(/^(.*)\s+([A-Z0-9]{2,6})$/);
        if (trailingSetMatch) {
          name = trailingSetMatch[1].trim();
          set = trailingSetMatch[2].trim();
        }
      }
    }
    cards.push({ name, set, qty });
  }
  return cards;
}

(async function main() {
  const client = await pool.connect();
  try {
    const selectQ = `
      SELECT c.id AS container_id, c.decklist_id, d.decklist
      FROM containers c
      LEFT JOIN decklists d ON d.id = c.decklist_id
      WHERE c.decklist_id IS NOT NULL
        AND (c.cards IS NULL OR jsonb_array_length(c.cards) = 0);
    `;
    const { rows } = await client.query(selectQ);
    console.log('Found', rows.length, 'containers to backfill');

    for (const r of rows) {
      const parsed = parseDecklistTextToCards(r.decklist || "");
      console.log('Backfilling container', r.container_id, 'with', parsed.length, 'cards');
      const updateQ = 'UPDATE containers SET cards = $1::jsonb WHERE id = $2';
      await client.query(updateQ, [JSON.stringify(parsed), r.container_id]);
    }

    console.log('Backfill complete');
  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
