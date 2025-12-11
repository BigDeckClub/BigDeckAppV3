import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function DecksRevamp() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/decks');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        // Accept { decks: [...] } or array
        const raw = Array.isArray(json) ? json : (json.decks || json.items || []);
        if (mounted) setDecks(raw);
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="container mx-auto p-6">Loading decks…</div>;
  if (error) return <div className="container mx-auto p-6">Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl mb-4">Decks</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {decks.map((d, i) => (
          <Card key={d.id || i} className="flex flex-col justify-between">
            <div>
              <div className="text-lg font-semibold">{d.name || d.title || `Deck ${i + 1}`}</div>
              <div className="text-sm text-muted">{d.format || d.type || 'Unknown format'}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">View</Button>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
