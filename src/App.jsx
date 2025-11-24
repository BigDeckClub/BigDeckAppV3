import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, FileText, Package, Copy, Layers, AlertCircle, TrendingUp, Settings, RefreshCw, DollarSign, X } from 'lucide-react';

// Use relative path - Vite dev server will proxy to backend
const API_BASE = '/api';

export default function MTGInventoryTracker() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [decklists, setDecklists] = useState([]);
  const [containers, setContainers] = useState([]);
  const [sales, setSales] = useState([]);
  const [reorderSettings, setReorderSettings] = useState({ bulk: 12, land: 20, normal: 4 });
  const [usageHistory, setUsageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedContainerForSale, setSelectedContainerForSale] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCardSets, setSelectedCardSets] = useState([]);
  
  const [newEntry, setNewEntry] = useState({
    quantity: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    reorderType: 'normal',
    selectedSet: null
  });

  const [decklistName, setDecklistName] = useState('');
  const [decklistPaste, setDecklistPaste] = useState('');
  const [showDecklistForm, setShowDecklistForm] = useState(false);
  const [deckPreview, setDeckPreview] = useState(null);
  const [deckPreviewLoading, setDeckPreviewLoading] = useState(false);

  const [containerName, setContainerName] = useState('');
  const [selectedDecklist, setSelectedDecklist] = useState(null);
  const [showContainerForm, setShowContainerForm] = useState(false);
  const [showSetSelector, setShowSetSelector] = useState(false);
  const [setSelectionData, setSetSelectionData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [priceCache, setPriceCache] = useState({});

  // Price display component
  const MarketPrices = ({ cardName, setCode }) => {
    const [prices, setPrices] = useState(null);
    
    useEffect(() => {
      const cacheKey = `${cardName}|${setCode}`;
      if (priceCache[cacheKey]) {
        setPrices(priceCache[cacheKey]);
      } else {
        const fetchPrices = async () => {
          try {
            const response = await fetch(`${API_BASE}/prices/${encodeURIComponent(cardName)}/${setCode}`);
            if (response.ok) {
              const priceData = await response.json();
              setPrices(priceData);
              setPriceCache(prev => ({...prev, [cacheKey]: priceData}));
              return;
            }
          } catch (error) {
            console.error('Error fetching prices from backend:', error);
          }
          const fallback = { tcg: 'N/A', ck: 'N/A' };
          setPrices(fallback);
          setPriceCache(prev => ({...prev, [cacheKey]: fallback}));
        };
        fetchPrices();
      }
    }, [cardName, setCode]);
    
    if (!prices) return <div className="text-xs text-gray-500">Loading...</div>;
    return (
      <div className="text-xs whitespace-nowrap">
        <div className="text-purple-300">TCG: {prices.tcg}</div>
        <div className="text-blue-300">CK: {prices.ck}</div>
      </div>
    );
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadInventory(),
      loadDecklists(),
      loadContainers(),
      loadSales(),
      loadReorderSettings(),
      loadUsageHistory()
    ]);
    setIsLoading(false);
  };

  const loadInventory = async () => {
    try {
      console.log('Fetching inventory from:', `${API_BASE}/inventory`);
      const response = await fetch(`${API_BASE}/inventory`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error.message, error);
    }
  };

  const addInventoryItem = async (item) => {
    try {
      console.log('Adding inventory item to:', `${API_BASE}/inventory`, 'Body:', item);
      const response = await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      console.log('Response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      await loadInventory();
      alert('Card added successfully!');
      return true;
    } catch (error) {
      console.error('Error adding inventory item:', error.message, error);
      alert('Error adding card: ' + error.message);
      return false;
    }
  };

  const startEditingItem = (item) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity,
      purchase_price: item.purchase_price || '',
      purchase_date: item.purchase_date || '',
      reorder_type: item.reorder_type || 'normal'
    });
  };

  const updateInventoryItem = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(editForm.quantity),
          purchase_price: editForm.purchase_price ? parseFloat(editForm.purchase_price) : null,
          purchase_date: editForm.purchase_date,
          reorder_type: editForm.reorder_type
        })
      });
      if (!response.ok) throw new Error('Failed to update card');
      await loadInventory();
      setEditingId(null);
      alert('Card updated successfully!');
    } catch (error) {
      console.error('Error updating inventory item:', error);
      alert('Error updating card: ' + error.message);
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' });
      await loadInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  };

  const fetchCardPrices = async (cardName, setCode) => {
    const cacheKey = `${cardName}|${setCode}`;
    if (priceCache[cacheKey]) {
      return priceCache[cacheKey];
    }
    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode}&unique=prints`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const card = data.data[0];
          const prices = {
            tcgplayer: card.prices?.usd ? `$${parseFloat(card.prices.usd).toFixed(2)}` : 'N/A',
            cardkingdom: card.prices?.usd_foil ? `$${parseFloat(card.prices.usd_foil).toFixed(2)}` : 'N/A'
          };
          setPriceCache(prev => ({...prev, [cacheKey]: prices}));
          return prices;
        }
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
    const fallback = { tcgplayer: 'N/A', cardkingdom: 'N/A' };
    setPriceCache(prev => ({...prev, [cacheKey]: fallback}));
    return fallback;
  };

  const searchScryfall = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      const cards = data.data.map(card => ({
        id: card.id,
        name: card.name,
        set: card.set.toUpperCase(),
        setName: card.set_name,
        type: card.type_line,
        imageUrl: card.image_uris?.normal || null
      }));
      
      setSearchResults(cards.slice(0, 10));
    } catch (error) {
      console.error('Error searching Scryfall:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.length > 2) {
      searchScryfall(value);
    }
  };

  const selectCard = async (card) => {
    // Fetch ALL printings of this card from Scryfall
    try {
      console.log('Fetching all printings of:', card.name);
      const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${card.name}"&unique=prints&order=released`);
      if (response.ok) {
        const data = await response.json();
        const allVersions = data.data.map(c => ({
          id: c.id,
          name: c.name,
          set: c.set.toUpperCase(),
          setName: c.set_name,
          type: c.type_line,
          imageUrl: c.image_uris?.normal || null
        }));
        console.log('Found', allVersions.length, 'printings of', card.name);
        setSelectedCardSets(allVersions);
      } else {
        // Fallback to search results if API call fails
        const cardVersions = searchResults.filter(c => c.name === card.name);
        setSelectedCardSets(cardVersions.length > 0 ? cardVersions : [card]);
      }
    } catch (error) {
      console.error('Error fetching card printings:', error);
      const cardVersions = searchResults.filter(c => c.name === card.name);
      setSelectedCardSets(cardVersions.length > 0 ? cardVersions : [card]);
    }
    
    setNewEntry({
      ...newEntry,
      selectedSet: {
        id: card.id,
        name: card.name,
        set: card.set,
        setName: card.setName,
        imageUrl: card.imageUrl
      }
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const addCard = async () => {
    if (!newEntry.selectedSet) {
      alert('Please select a card');
      return;
    }

    const item = {
      name: newEntry.selectedSet.name,
      set: newEntry.selectedSet.set,
      set_name: newEntry.selectedSet.setName,
      quantity: newEntry.quantity,
      purchase_date: newEntry.purchaseDate,
      purchase_price: newEntry.purchasePrice ? parseFloat(newEntry.purchasePrice) : null,
      reorder_type: newEntry.reorderType,
      image_url: newEntry.selectedSet.imageUrl
    };

    if (await addInventoryItem(item)) {
      setNewEntry({
        quantity: 1,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        reorderType: 'normal',
        selectedSet: null
      });
    }
  };

  const loadDecklists = async () => {
    try {
      const response = await fetch(`${API_BASE}/decklists`);
      const data = await response.json();
      setDecklists(data || []);
    } catch (error) {
      console.error('Error loading decklists:', error);
    }
  };

  const parseAndPreviewDecklist = async () => {
    if (!decklistName || !decklistPaste) {
      alert('Please fill in all fields');
      return;
    }

    setDeckPreviewLoading(true);
    try {
      const lines = decklistPaste.split('\n').filter(line => line.trim());
      const cardsToFind = [];

      // Parse decklist lines
      lines.forEach(line => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const quantity = parseInt(match[1]);
          const cardName = match[2].trim();
          cardsToFind.push({ name: cardName, quantity });
        }
      });

      // Find matches in inventory
      const previewCards = await Promise.all(cardsToFind.map(async (card) => {
        // Search for this card in Scryfall
        try {
          const scryfallRes = await fetch(`https://api.scryfall.com/cards/search?q=!"${card.name}"&unique=prints`);
          const scryfallData = await scryfallRes.json();
          
          // Find matching cards in inventory
          const inventoryMatches = inventory.filter(inv => 
            inv.name.toLowerCase() === card.name.toLowerCase()
          );

          return {
            cardName: card.name,
            needed: card.quantity,
            available: inventoryMatches.reduce((sum, item) => sum + (item.quantity || 0), 0),
            inventoryItems: inventoryMatches,
            scryfallCards: scryfallData.data || []
          };
        } catch (err) {
          return {
            cardName: card.name,
            needed: card.quantity,
            available: 0,
            inventoryItems: [],
            scryfallCards: [],
            error: 'Failed to fetch from Scryfall'
          };
        }
      }));

      setDeckPreview(previewCards);
    } catch (error) {
      console.error('Error parsing decklist:', error);
      alert('Error parsing decklist: ' + error.message);
    } finally {
      setDeckPreviewLoading(false);
    }
  };

  const confirmAndAddDecklist = async () => {
    try {
      const response = await fetch(`${API_BASE}/decklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: decklistName, decklist: decklistPaste })
      });
      if (!response.ok) throw new Error('Failed to add decklist');
      setDecklistName('');
      setDecklistPaste('');
      setShowDecklistForm(false);
      setDeckPreview(null);
      await loadDecklists();
    } catch (error) {
      console.error('Error adding decklist:', error);
      alert('Error adding decklist: ' + error.message);
    }
  };

  const deleteDecklist = async (id) => {
    try {
      await fetch(`${API_BASE}/decklists/${id}`, { method: 'DELETE' });
      await loadDecklists();
    } catch (error) {
      console.error('Error deleting decklist:', error);
    }
  };

  const loadContainers = async () => {
    try {
      const response = await fetch(`${API_BASE}/containers`);
      const data = await response.json();
      setContainers(data || []);
    } catch (error) {
      console.error('Error loading containers:', error);
    }
  };

  const addContainer = async () => {
    if (!containerName || !selectedDecklist) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: containerName, decklist_id: parseInt(selectedDecklist) })
      });
      if (!response.ok) throw new Error('Failed to add container');
      setContainerName('');
      setSelectedDecklist(null);
      setShowContainerForm(false);
      await loadContainers();
    } catch (error) {
      console.error('Error adding container:', error);
    }
  };

  const deleteContainer = async (id) => {
    try {
      await fetch(`${API_BASE}/containers/${id}`, { method: 'DELETE' });
      await loadContainers();
    } catch (error) {
      console.error('Error deleting container:', error);
    }
  };

  const loadSales = async () => {
    try {
      const response = await fetch(`${API_BASE}/sales`);
      const data = await response.json();
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    }
  };

  const calculateDeckCOGS = (decklistId) => {
    // Parse decklist to find card names and quantities
    const deck = decklists.find(d => d.id === decklistId);
    if (!deck || !deck.decklist) return 0;

    let totalCost = 0;
    const lines = deck.decklist.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();
        
        // Find matching card in inventory
        const inventoryCard = inventory.find(card => 
          card.name.toLowerCase() === cardName.toLowerCase()
        );
        
        if (inventoryCard && inventoryCard.purchase_price) {
          totalCost += quantity * (parseFloat(inventoryCard.purchase_price) || 0);
        }
      }
    });
    
    return totalCost;
  };

  const sellContainer = async () => {
    if (!selectedContainerForSale || !salePrice) {
      alert('Please enter a sale price');
      return;
    }

    try {
      const container = containers.find(c => c.id === selectedContainerForSale);
      
      const response = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_id: selectedContainerForSale,
          decklist_id: container.decklist_id,
          sale_price: parseFloat(salePrice)
        })
      });
      
      if (!response.ok) throw new Error('Failed to record sale');
      
      await loadSales();
      setShowSellModal(false);
      setSelectedContainerForSale(null);
      setSalePrice('');
      alert('Container sold! Sale recorded.');
    } catch (error) {
      console.error('Error recording sale:', error);
      alert('Error recording sale: ' + error.message);
    }
  };

  const loadReorderSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/reorder_thresholds`);
      const data = await response.json();
      if (data) {
        setReorderSettings(data);
      }
    } catch (error) {
      console.error('Error loading reorder settings:', error);
    }
  };

  const saveReorderSettings = async () => {
    try {
      await fetch(`${API_BASE}/settings/reorder_thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: reorderSettings })
      });
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving reorder settings:', error);
    }
  };

  const loadUsageHistory = async () => {
    // Usage history is not critical, skip for now
  };

  const recordUsage = async (action, details) => {
    // Usage history is not critical, skip for now
  };

  const getReorderAlerts = () => {
    return inventory.filter(item => {
      const threshold = reorderSettings[item.reorder_type] || 5;
      return item.quantity <= threshold;
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white">
      {/* Navigation */}
      <nav className="bg-black bg-opacity-50 border-b border-purple-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-300">MTG Card Manager</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded transition ${activeTab === 'inventory' ? 'bg-purple-600' : 'hover:bg-purple-700'}`}
            >
              <Layers className="w-5 h-5 inline mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('decklists')}
              className={`px-4 py-2 rounded transition ${activeTab === 'decklists' ? 'bg-purple-600' : 'hover:bg-purple-700'}`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Decklists
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`px-4 py-2 rounded transition ${activeTab === 'containers' ? 'bg-purple-600' : 'hover:bg-purple-700'}`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Containers
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded transition ${activeTab === 'analytics' ? 'bg-purple-600' : 'hover:bg-purple-700'}`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 rounded transition ${activeTab === 'sales' ? 'bg-purple-600' : 'hover:bg-purple-700'}`}
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Sales
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 rounded hover:bg-purple-700 transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && !isLoading && (
          <div className="space-y-6">
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Add Card to Inventory</h2>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for a card..."
                    value={searchQuery}
                    onChange={handleSearch}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white placeholder-gray-400"
                  />
                  <Search className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" />
                  
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-purple-400 rounded shadow-lg max-h-64 overflow-y-auto z-10">
                      {searchResults.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => selectCard(card)}
                          className="px-4 py-2 hover:bg-purple-700 cursor-pointer border-b border-purple-400"
                        >
                          <div className="font-semibold">{card.name}</div>
                          <div className="text-sm text-gray-300">{card.setName} ({card.set})</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {newEntry.selectedSet && (
                  <div className="space-y-2">
                    <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-3">
                      <div className="font-semibold">{newEntry.selectedSet.name}</div>
                      <div className="text-sm text-gray-300">{newEntry.selectedSet.setName} ({newEntry.selectedSet.set})</div>
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
                          className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                        >
                          {selectedCardSets.map((card) => (
                            <option key={`${card.id}`} value={`${card.set}|${card.name}`}>
                              {card.setName} ({card.set})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    min="1"
                    value={newEntry.quantity}
                    onChange={(e) => setNewEntry({...newEntry, quantity: parseInt(e.target.value)})}
                    placeholder="Quantity"
                    className="bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                  <input
                    type="date"
                    value={newEntry.purchaseDate}
                    onChange={(e) => setNewEntry({...newEntry, purchaseDate: e.target.value})}
                    className="bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.01"
                    value={newEntry.purchasePrice}
                    onChange={(e) => setNewEntry({...newEntry, purchasePrice: e.target.value})}
                    placeholder="Purchase Price ($)"
                    className="bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                  <select
                    value={newEntry.reorderType}
                    onChange={(e) => setNewEntry({...newEntry, reorderType: e.target.value})}
                    className="bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="land">Land</option>
                    <option value="bulk">Bulk</option>
                  </select>
                </div>

                <button
                  onClick={addCard}
                  disabled={!newEntry.selectedSet}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded px-4 py-2 font-semibold transition"
                >
                  <Plus className="w-5 h-5 inline mr-2" />
                  Add Card
                </button>
              </div>
            </div>

            {/* Inventory List */}
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Card Inventory</h2>
              <div className="grid gap-4">
                {Object.entries(
                  inventory.reduce((acc, item) => {
                    if (!acc[item.name]) {
                      acc[item.name] = [];
                    }
                    acc[item.name].push(item);
                    return acc;
                  }, {})
                ).map(([cardName, items]) => {
                  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                  const avgPrice = items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0) * item.quantity, 0) / totalQty;
                  const isExpanded = expandedCards[cardName];
                  
                  return (
                    <div key={cardName} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedCards({...expandedCards, [cardName]: !isExpanded})}>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{cardName}</div>
                          <div className="text-sm text-gray-300">Total: {totalQty} copies | Avg Price: ${avgPrice.toFixed(2)}</div>
                        </div>
                        <div className="text-purple-400 ml-4">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-purple-600 pt-4">
                          {items.map((item) => {
                            const isEditing = editingId === item.id;
                            return (
                              <div key={item.id} className="bg-black bg-opacity-50 border border-purple-300 rounded p-3">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <div className="text-sm text-gray-400">{item.set_name} ({item.set})</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={editForm.quantity}
                                        onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                                        placeholder="Quantity"
                                        className="bg-black bg-opacity-50 border border-purple-400 rounded px-2 py-1 text-white text-sm"
                                      />
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.purchase_price}
                                        onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})}
                                        placeholder="Price"
                                        className="bg-black bg-opacity-50 border border-purple-400 rounded px-2 py-1 text-white text-sm"
                                      />
                                      <input
                                        type="date"
                                        value={editForm.purchase_date}
                                        onChange={(e) => setEditForm({...editForm, purchase_date: e.target.value})}
                                        className="bg-black bg-opacity-50 border border-purple-400 rounded px-2 py-1 text-white text-sm"
                                      />
                                      <select
                                        value={editForm.reorder_type}
                                        onChange={(e) => setEditForm({...editForm, reorder_type: e.target.value})}
                                        className="bg-black bg-opacity-50 border border-purple-400 rounded px-2 py-1 text-white text-sm"
                                      >
                                        <option value="normal">Normal</option>
                                        <option value="land">Land</option>
                                        <option value="bulk">Bulk</option>
                                      </select>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => updateInventoryItem(item.id)}
                                        className="flex-1 bg-green-600 hover:bg-green-700 rounded px-3 py-1 text-sm font-semibold"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-400">{item.set_name} ({item.set})</div>
                                      <div className="text-sm text-gray-300">Qty: {item.quantity} | Purchase: ${item.purchase_price || 'N/A'}</div>
                                    </div>
                                    <div className="flex items-center gap-6 ml-4">
                                      <MarketPrices cardName={item.name} setCode={item.set} priceCache={priceCache} setPriceCache={setPriceCache} />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => startEditingItem(item)}
                                          className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-sm"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => deleteInventoryItem(item.id)}
                                          className="bg-red-600 hover:bg-red-700 rounded px-3 py-1 text-sm"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {inventory.length === 0 && <p className="text-gray-400">No cards in inventory yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Decklists Tab */}
        {activeTab === 'decklists' && !isLoading && (
          <div className="space-y-6">
            {!showDecklistForm ? (
              <button
                onClick={() => setShowDecklistForm(true)}
                className="bg-purple-600 hover:bg-purple-700 rounded px-6 py-3 font-semibold transition"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Decklist
              </button>
            ) : (
              <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
                <h2 className="text-xl font-bold mb-4">Create Decklist</h2>
                <input
                  type="text"
                  placeholder="Decklist Name"
                  value={decklistName}
                  onChange={(e) => setDecklistName(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4"
                />
                <textarea
                  placeholder="Paste decklist here (e.g., '2 Lightning Bolt')"
                  value={decklistPaste}
                  onChange={(e) => setDecklistPaste(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4 h-48"
                />
                <div className="flex gap-2">
                  <button
                    onClick={parseAndPreviewDecklist}
                    disabled={deckPreviewLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded px-4 py-2 font-semibold"
                  >
                    {deckPreviewLoading ? 'Checking...' : 'Check Inventory'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDecklistForm(false);
                      setDeckPreview(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {deckPreview && (
                  <div className="mt-6 border-t border-purple-500 pt-4">
                    <h3 className="font-semibold mb-3">Inventory Preview</h3>
                    <div className="bg-black bg-opacity-50 rounded p-4 max-h-64 overflow-y-auto space-y-2">
                      {deckPreview.map((card, idx) => (
                        <div key={idx} className={`p-2 rounded border-l-4 ${card.available >= card.needed ? 'border-green-500 bg-green-900 bg-opacity-20' : 'border-red-500 bg-red-900 bg-opacity-20'}`}>
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold">{card.cardName}</span>
                            <span className={card.available >= card.needed ? 'text-green-400' : 'text-red-400'}>
                              {card.available}/{card.needed}
                            </span>
                          </div>
                          {card.inventoryItems.length > 0 && (
                            <div className="text-xs text-gray-400 ml-2 mt-1">
                              {card.inventoryItems.map((item, i) => (
                                <div key={i}>{item.set_name} ({item.quantity}x)</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={confirmAndAddDecklist}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold"
                    >
                      Confirm & Create Decklist
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Decklists ({decklists.length})</h2>
              <div className="grid gap-4">
                {decklists.map((deck) => (
                  <div key={deck.id} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{deck.name}</div>
                      <div className="text-sm text-gray-300 mt-2 line-clamp-2">{deck.decklist}</div>
                    </div>
                    <button
                      onClick={() => deleteDecklist(deck.id)}
                      className="bg-red-600 hover:bg-red-700 rounded px-3 py-2 ml-4"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {decklists.length === 0 && <p className="text-gray-400">No decklists yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Containers Tab */}
        {activeTab === 'containers' && !isLoading && (
          <div className="space-y-6">
            {!showContainerForm ? (
              <button
                onClick={() => setShowContainerForm(true)}
                className="bg-purple-600 hover:bg-purple-700 rounded px-6 py-3 font-semibold transition"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Container
              </button>
            ) : (
              <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
                <h2 className="text-xl font-bold mb-4">Create Container</h2>
                <input
                  type="text"
                  placeholder="Container Name"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4"
                />
                <select
                  value={selectedDecklist || ''}
                  onChange={(e) => setSelectedDecklist(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4"
                >
                  <option value="">Select a Decklist</option>
                  {decklists.map((deck) => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addContainer}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-semibold"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowContainerForm(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Containers ({containers.length})</h2>
              <div className="grid gap-4">
                {containers.map((container) => (
                  <div key={container.id} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{container.name}</div>
                      <div className="text-sm text-gray-300">Decklist ID: {container.decklist_id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedContainerForSale(container.id);
                          setShowSellModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold flex items-center gap-2"
                      >
                        <DollarSign className="w-5 h-5" />
                        Sell
                      </button>
                      <button
                        onClick={() => deleteContainer(container.id)}
                        className="bg-red-600 hover:bg-red-700 rounded px-3 py-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {containers.length === 0 && <p className="text-gray-400">No containers yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && !isLoading && (
          <div className="space-y-6">
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                Sales Analytics
              </h2>
              
              {sales.length > 0 ? (
                <div className="space-y-4">
                  {sales.map((sale) => {
                    const deckCOGS = calculateDeckCOGS(sale.decklist_id);
                    const profit = sale.sale_price - deckCOGS;
                    const profitPercentage = deckCOGS > 0 ? ((profit / deckCOGS) * 100).toFixed(2) : 0;
                    const container = containers.find(c => c.id === sale.container_id);
                    
                    return (
                      <div key={sale.id} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{container?.name || 'Unknown Container'}</div>
                            <div className="text-sm text-gray-400">{new Date(sale.sold_date).toLocaleDateString()}</div>
                          </div>
                          <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {profit >= 0 ? '+' : ''} ${profit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3">
                            <div className="text-gray-400 text-xs">COGS</div>
                            <div className="font-semibold text-purple-300">${deckCOGS.toFixed(2)}</div>
                          </div>
                          <div className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3">
                            <div className="text-gray-400 text-xs">Sale Price</div>
                            <div className="font-semibold text-blue-300">${sale.sale_price.toFixed(2)}</div>
                          </div>
                          <div className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3">
                            <div className="text-gray-400 text-xs">Profit %</div>
                            <div className={`font-semibold ${profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>{profitPercentage}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-6 pt-6 border-t border-purple-500">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-900 bg-opacity-50 rounded p-4 border border-purple-400">
                        <div className="text-gray-400 text-sm">Total Sales</div>
                        <div className="text-2xl font-bold text-purple-300">{sales.length}</div>
                      </div>
                      <div className="bg-purple-900 bg-opacity-50 rounded p-4 border border-purple-400">
                        <div className="text-gray-400 text-sm">Total Revenue</div>
                        <div className="text-2xl font-bold text-blue-300">${sales.reduce((sum, s) => sum + s.sale_price, 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-purple-900 bg-opacity-50 rounded p-4 border border-purple-400">
                        <div className="text-gray-400 text-sm">Total Profit</div>
                        <div className="text-2xl font-bold text-green-300">${sales.reduce((sum, s) => sum + (s.sale_price - calculateDeckCOGS(s.decklist_id)), 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No sales recorded yet. Sell containers to see analytics here.</p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !isLoading && (
          <div className="space-y-6">
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
                Reorder Alerts
              </h2>
              <div className="grid gap-4">
                {getReorderAlerts().length > 0 ? (
                  getReorderAlerts().map((item) => (
                    <div key={item.id} className="bg-black bg-opacity-50 border border-red-400 rounded p-4">
                      <div className="font-semibold text-red-400">{item.name}</div>
                      <div className="text-sm text-gray-300">Quantity: {item.quantity} (Type: {item.reorder_type})</div>
                      <div className="text-sm text-gray-300">Set: {item.set_name}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No items below reorder threshold.</p>
                )}
              </div>
            </div>

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Inventory Statistics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                  <div className="text-gray-400 text-sm">Total Cards</div>
                  <div className="text-2xl font-bold text-purple-300">{inventory.length}</div>
                </div>
                <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                  <div className="text-gray-400 text-sm">Total Quantity</div>
                  <div className="text-2xl font-bold text-purple-300">{inventory.reduce((sum, card) => sum + (card.quantity || 0), 0)}</div>
                </div>
                <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                  <div className="text-gray-400 text-sm">Total Value</div>
                  <div className="text-2xl font-bold text-purple-300">${inventory.reduce((sum, card) => sum + (parseFloat(card.purchase_price) || 0), 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="grid gap-2">
                {usageHistory.length > 0 ? (
                  usageHistory.map((entry, idx) => (
                    <div key={idx} className="bg-black bg-opacity-50 border border-purple-400 rounded p-3 text-sm">
                      <span className="font-semibold text-purple-300">{entry.action}</span>
                      <span className="text-gray-400"> - {new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sell Modal */}
        {showSellModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-purple-900 border border-purple-500 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Sell Container</h2>
                <button
                  onClick={() => {
                    setShowSellModal(false);
                    setSelectedContainerForSale(null);
                    setSalePrice('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {selectedContainerForSale && (
                <div className="mb-4">
                  <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-3 mb-4">
                    <div className="text-sm text-gray-400">Container</div>
                    <div className="font-semibold">{containers.find(c => c.id === selectedContainerForSale)?.name}</div>
                  </div>
                  
                  <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-3 mb-4">
                    <div className="text-sm text-gray-400">Estimated COGS</div>
                    <div className="font-semibold text-purple-300">
                      ${calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Sale Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Enter sale price"
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                
                {salePrice && (
                  <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded p-3">
                    <div className="text-sm text-gray-400">Estimated Profit</div>
                    <div className={`font-semibold text-lg ${(salePrice - calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(salePrice - calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id)).toFixed(2)}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={sellContainer}
                    className="flex-1 bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold"
                  >
                    Confirm Sale
                  </button>
                  <button
                    onClick={() => {
                      setShowSellModal(false);
                      setSelectedContainerForSale(null);
                      setSalePrice('');
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-purple-900 border border-purple-500 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Reorder Thresholds</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Normal Cards</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.normal}
                    onChange={(e) => setReorderSettings({...reorderSettings, normal: parseInt(e.target.value)})}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Lands</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.land}
                    onChange={(e) => setReorderSettings({...reorderSettings, land: parseInt(e.target.value)})}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bulk Items</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.bulk}
                    onChange={(e) => setReorderSettings({...reorderSettings, bulk: parseInt(e.target.value)})}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveReorderSettings}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
