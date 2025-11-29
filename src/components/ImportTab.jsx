import React, { useState } from 'react';
import { Download, Plus, Trash2, CheckCircle, Clock, Layers, X } from 'lucide-react';

export const ImportTab = ({ 
  imports, 
  onLoadImports, 
  successMessage, 
  setSuccessMessage,
  newEntry,
  setNewEntry,
  selectedCardSets,
  allSets,
  defaultSearchSet,
  setDefaultSearchSet,
  searchQuery,
  setSearchQuery,
  searchResults,
  showDropdown,
  setShowDropdown,
  selectCard,
  addCard,
  handleSearch
}) => {
  const [showImportForm, setShowImportForm] = useState(false);
  const [importForm, setImportForm] = useState({
    title: '',
    description: '',
    cardList: '',
    source: 'wholesale',
    status: 'pending'
  });

  const handleAddImport = async () => {
    if (!importForm.title || !importForm.cardList) {
      setSuccessMessage('Error: Please enter a title and card list');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importForm)
      });

      if (!response.ok) throw new Error('Failed to create import');
      
      setImportForm({ title: '', description: '', cardList: '', source: 'wholesale', status: 'pending' });
      setShowImportForm(false);
      setSuccessMessage('Import order created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      onLoadImports();
    } catch (error) {
      setSuccessMessage('Error: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleDeleteImport = async (id) => {
    if (!confirm('Delete this import order?')) return;

    try {
      const response = await fetch(`/api/imports/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete import');
      
      setSuccessMessage('Import order deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
      onLoadImports();
    } catch (error) {
      setSuccessMessage('Error: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleMarkComplete = async (id) => {
    try {
      const response = await fetch(`/api/imports/${id}/complete`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to update import');
      
      setSuccessMessage('Import order marked as completed!');
      setTimeout(() => setSuccessMessage(''), 3000);
      onLoadImports();
    } catch (error) {
      setSuccessMessage('Error: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Card Section */}
      <div className="card rounded-lg p-4 sm:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-6 h-6 text-teal-400" />
          <h2 className="text-lg sm:text-xl font-bold">Add Card to Inventory</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Preferred Set (optional):</label>
              <select
                value={defaultSearchSet}
                onChange={(e) => {
                  setDefaultSearchSet(e.target.value);
                  localStorage.setItem('defaultSearchSet', e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white text-sm"
              >
                <option value="">Show most recent</option>
                {allSets.map(set => (
                  <option key={set.code} value={set.code}>{set.code} - {set.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Folder:</label>
              <input
                type="text"
                placeholder="e.g. Modern, Standard"
                value={newEntry.folder || 'Uncategorized'}
                onChange={(e) => setNewEntry({...newEntry, folder: e.target.value || 'Uncategorized'})}
                className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white placeholder-gray-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Location:</label>
              <input
                type="text"
                placeholder="e.g. Shelf A, Box 1"
                value={newEntry.location}
                onChange={(e) => setNewEntry({...newEntry, location: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white placeholder-gray-400 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={newEntry.isSharedLocation}
              onChange={(e) => setNewEntry({...newEntry, isSharedLocation: e.target.checked})}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">This is a shared location</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a card..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white placeholder-gray-400"
            />
            
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-20">
                {(() => {
                  const seen = new Set();
                  return searchResults
                    .filter(card => {
                      if (seen.has(card.name)) return false;
                      seen.add(card.name);
                      return true;
                    })
                    .map((card, idx) => (
                      <div
                        key={`${card.name}-${idx}`}
                        onClick={() => selectCard(card)}
                        className="px-4 py-3 hover:bg-teal-600/30 cursor-pointer border-b border-slate-700 last:border-b-0 active:bg-teal-600/50"
                      >
                        <div className="font-semibold text-sm sm:text-base">{card.name}</div>
                      </div>
                    ));
                })()}
              </div>
            )}
          </div>

          {newEntry.selectedSet && (
            <div className="space-y-2">
              <div className="bg-slate-800 border border-slate-600 rounded p-3">
                <div className="font-semibold">{newEntry.selectedSet.name}</div>
                <div className="text-sm text-slate-300">{newEntry.selectedSet.setName} ({newEntry.selectedSet.set})</div>
              </div>
              {selectedCardSets.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Change Set (if available):</label>
                  <select
                    value={`${newEntry.selectedSet.set}|${newEntry.selectedSet.name}`}
                    onChange={(e) => {
                      const selectedCard = selectedCardSets.find(c => `${c.set}|${c.name}` === e.target.value);
                      if (selectedCard) selectCard(selectedCard);
                    }}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                  >
                    {(() => {
                      const seen = new Set();
                      return selectedCardSets
                        .filter(card => {
                          if (seen.has(card.set)) return false;
                          seen.add(card.set);
                          return true;
                        })
                        .sort((a, b) => a.set.localeCompare(b.set))
                        .map((card) => (
                          <option key={`${card.id}`} value={`${card.set}|${card.name}`}>
                            {card.set} - {card.setName}
                          </option>
                        ));
                    })()}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="number"
              min="1"
              value={newEntry.quantity}
              onChange={(e) => setNewEntry({...newEntry, quantity: parseInt(e.target.value)})}
              placeholder="Quantity"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-base"
            />
            <input
              type="date"
              value={newEntry.purchaseDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setNewEntry({...newEntry, purchaseDate: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="number"
              step="0.01"
              value={newEntry.purchasePrice}
              onChange={(e) => setNewEntry({...newEntry, purchasePrice: e.target.value})}
              placeholder="Purchase Price ($)"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-base"
            />
            <select
              value={newEntry.reorderType}
              onChange={(e) => setNewEntry({...newEntry, reorderType: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-base"
            >
              <option value="normal">Normal</option>
              <option value="land">Land</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>

          <button
            onClick={addCard}
            disabled={!newEntry.selectedSet}
            className="w-full btn-primary disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-600 rounded-lg px-4 py-3 font-semibold transition"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add Card
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold">Import Orders</h2>
        </div>
        <button
          onClick={() => setShowImportForm(!showImportForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Import Order
        </button>
      </div>

      {/* Add Import Form */}
      {showImportForm && (
        <div className="card p-6 space-y-4 border border-cyan-500/30 bg-slate-800/50">
          <h3 className="text-lg font-bold">Create New Import Order</h3>
          
          <input
            type="text"
            placeholder="Import Order Title"
            value={importForm.title}
            onChange={(e) => setImportForm({ ...importForm, title: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
          />

          <input
            type="text"
            placeholder="Description (optional)"
            value={importForm.description}
            onChange={(e) => setImportForm({ ...importForm, description: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
          />

          <select
            value={importForm.source}
            onChange={(e) => setImportForm({ ...importForm, source: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="wholesale">Wholesale</option>
            <option value="distributor">Distributor</option>
            <option value="local">Local Supplier</option>
            <option value="other">Other</option>
          </select>

          <textarea
            placeholder="Card List (e.g., 4x Black Lotus&#10;2x Mox Pearl&#10;...)"
            value={importForm.cardList}
            onChange={(e) => setImportForm({ ...importForm, cardList: e.target.value })}
            rows="6"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono text-sm"
          />

          <div className="flex gap-2">
            <button
              onClick={handleAddImport}
              className="btn-primary flex-1"
            >
              Create Import Order
            </button>
            <button
              onClick={() => setShowImportForm(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 rounded px-4 py-2 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-3 text-emerald-300">
          {successMessage}
        </div>
      )}

      {/* Import Orders List */}
      {imports && imports.length > 0 ? (
        <div className="space-y-3">
          {imports.map((imp) => (
            <div
              key={imp.id}
              className="card p-4 border border-slate-600 hover:border-slate-500 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold truncate">{imp.title}</h3>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      imp.status === 'completed' 
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {imp.status === 'completed' ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                  
                  {imp.description && (
                    <p className="text-sm text-slate-400 mb-2">{imp.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Source: {imp.source}</span>
                    <span>Created: {new Date(imp.created_at).toLocaleDateString()}</span>
                  </div>

                  {imp.card_list && (
                    <div className="mt-3 bg-slate-900/50 rounded p-2 max-h-20 overflow-y-auto">
                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{imp.card_list}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {imp.status !== 'completed' && (
                    <button
                      onClick={() => handleMarkComplete(imp.id)}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 transition flex items-center gap-1 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Done
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteImport(imp.id)}
                    className="px-3 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition flex items-center gap-1 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-slate-400">
          <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No import orders yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
};

export default ImportTab;
