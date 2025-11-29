import React, { useState, useMemo } from 'react';
import { Plus, Trash2, MapPin, Share2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';

const API_BASE = '/api';

export const ContainersTab = ({ inventory, successMessage, setSuccessMessage }) => {
  const { post, del } = useApi();
  
  const [containerName, setContainerName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Get unique locations from inventory
  const locations = useMemo(() => {
    return [...new Set(inventory.map(item => item.location).filter(Boolean))].sort();
  }, [inventory]);

  // Group inventory by location
  const inventoryByLocation = useMemo(() => {
    return inventory.reduce((acc, item) => {
      if (!acc[item.location]) {
        acc[item.location] = [];
      }
      acc[item.location].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const handleCreateContainer = async () => {
    if (!containerName.trim() || !selectedLocation) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await post(`${API_BASE}/containers`, {
        name: containerName,
        location: selectedLocation,
      });
      setContainerName('');
      setSelectedLocation('');
      setShowForm(false);
      setSuccessMessage('Container created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      alert('Error creating container: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Container Form */}
      <div className="card p-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full btn-primary px-4 py-3 font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Container
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Create Container</h2>
            <input
              type="text"
              placeholder="Container name (e.g., Showcase Box, Bulk Bin)"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white placeholder-gray-400"
            />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCreateContainer}
                className="flex-1 bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Locations and Inventory */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-100">Inventory by Location</h2>
        {locations.length === 0 ? (
          <div className="card p-6 text-center text-slate-400">
            No locations yet. Add cards with locations in the Inventory tab.
          </div>
        ) : (
          locations.map((location) => {
            const cards = inventoryByLocation[location] || [];
            const totalCards = cards.reduce((sum, card) => sum + (card.quantity || 0), 0);
            const totalValue = cards.reduce((sum, card) => sum + ((card.purchase_price || 0) * (card.quantity || 0)), 0);
            
            return (
              <div key={location} className="card p-4 border border-slate-600">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-teal-400" />
                      <h3 className="text-lg font-bold text-slate-100">{location}</h3>
                    </div>
                    <div className="flex gap-4 text-sm text-slate-400">
                      <span>📦 {cards.length} unique cards</span>
                      <span>🔢 {totalCards} copies</span>
                      <span>💰 ${totalValue.toFixed(2)}</span>
                      {cards.some(c => c.is_shared_location) && (
                        <span className="flex items-center gap-1 text-teal-300">
                          <Share2 className="w-4 h-4" />
                          Shared
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Cards in this location */}
                <div className="space-y-2 bg-slate-900 bg-opacity-50 rounded p-3">
                  {cards.map((card) => (
                    <div key={card.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <span className="font-semibold">{card.name}</span>
                        <span className="text-slate-400 ml-2">({card.set})</span>
                      </div>
                      <div className="flex gap-3 text-slate-400">
                        <span>Qty: {card.quantity}</span>
                        <span>${((card.purchase_price || 0) * card.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContainersTab;
