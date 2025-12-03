import React, { useState, useRef, useEffect } from 'react';
import { Download, Plus, Trash2, CheckCircle, Clock, Layers, X } from 'lucide-react';
import { RapidEntryTable } from './RapidEntryTable';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

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
  handleSearch,
  searchIsLoading,
  addInventoryItem,
}) => {
  const [showImportForm, setShowImportForm] = useState(false);
  const [createdFolders, setCreatedFolders] = useState([]);

  // Load folders from localStorage
  React.useEffect(() => {
    const savedFolders = localStorage.getItem('createdFolders');
    if (savedFolders) setCreatedFolders(JSON.parse(savedFolders));
  }, []);
  const [importForm, setImportForm] = useState({
    title: '',
    description: '',
    cardList: '',
    source: 'wholesale',
    status: 'pending'
  });

  // Handler for adding card from rapid entry
  const handleRapidAddCard = async (cardData) => {
    const item = {
      name: cardData.name,
      set: cardData.set,
      set_name: cardData.set_name,
      quantity: cardData.quantity,
      purchase_price: cardData.purchase_price,
      folder: cardData.folder || 'Unsorted',
      image_url: cardData.image_url,
      foil: cardData.foil || false,
      quality: cardData.quality || 'NM',
    };

    return await addInventoryItem(item);
  };

  const handleAddImport = async () => {
    if (!importForm.title || !importForm.cardList) {
      setSuccessMessage('Error: Please enter a title and card list');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    try {
      await api.post(API_ENDPOINTS.IMPORTS, importForm);
      
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
      await api.delete(`${API_ENDPOINTS.IMPORTS}/${id}`);
      
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
      await api.patch(`${API_ENDPOINTS.IMPORTS}/${id}/complete`);
      
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
      {/* Rapid Entry Section */}
      <div className="card rounded-lg p-4 sm:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-6 h-6 text-teal-400" />
          <h2 className="text-lg sm:text-xl font-bold">Rapid Card Entry</h2>
        </div>
        <RapidEntryTable
          onAddCard={handleRapidAddCard}
          allSets={allSets}
          createdFolders={createdFolders}
          handleSearch={handleSearch}
          searchResults={searchResults}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          searchIsLoading={searchIsLoading}
        />
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
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition flex items-center gap-1 text-sm"
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
