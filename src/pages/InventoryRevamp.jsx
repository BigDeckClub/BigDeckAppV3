import React, { useEffect, useState } from 'react';
import CardTile from '../components/ui/CardTile';
import { mapCardForTile } from '../utils/cardMapper';

export default function InventoryRevamp() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        // Accept either { cards: [...] } or an array directly
        const raw = Array.isArray(json) ? json : (json.cards || json.items || []);
        if (mounted) setCards(raw.map(mapCardForTile));
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="container mx-auto p-6">Loading inventory…</div>;
  if (error) return <div className="container mx-auto p-6">Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl mb-4">Inventory</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <CardTile key={i} title={c.title} qty={c.qty} unique={c.unique} cost={c.cost} coverUrl={c.coverUrl} />
        ))}
      </div>
    </div>
  );
}
