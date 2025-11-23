import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, FileText, Package, Copy, Layers, AlertCircle, TrendingUp, Settings, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MTGInventoryTracker() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [decklists, setDecklists] = useState([]);
  const [containers, setContainers] = useState([]);
  const [reorderSettings, setReorderSettings] = useState({ bulk: 12, land: 20, normal: 4 });
  const [usageHistory, setUsageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const [containerName, setContainerName] = useState('');
  const [selectedDecklist, setSelectedDecklist] = useState(null);
  const [showContainerForm, setShowContainerForm] = useState(false);
  const [showSetSelector, setShowSetSelector] = useState(false);
  const [setSelectionData, setSetSelectionData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadInventory(),
      loadDecklists(),
      loadContainers(),
      loadReorderSettings(),
      loadUsageHistory()
    ]);
    setIsLoading(false);
  };

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const addInventoryItem = async (item) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert([{
          card_id: item.cardId,
          name: item.name,
          set_name: item.setName,
          set_code: item.setCode,
          image_url: item.imageUrl,
          quantity: item.quantity,
          purchase_date: item.purchaseDate,
          purchase_price: item.purchasePrice,
          reorder_type: item.reorderType,
          card_kingdom_price: item.cardKingdomPrice,
          tcgplayer_price: item.tcgplayerPrice,
          scryfall_uri: item.scryfallUri
        }])
        .select();
      
      if (error) throw error;
      await loadInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      alert('Failed to add card to inventory');
    }
  };

  const removeInventoryItem = async (id) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadInventory();
    } catch (error) {
      console.error('Error removing inventory item:', error);
      alert('Failed to remove card');
    }
  };

  const updateInventoryQuantity = async (id, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        await removeInventoryItem(id);
      } else {
        const { error } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', id);
        
        if (error) throw error;
        await loadInventory();
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  const loadDecklists = async () => {
    try {
      const { data, error } = await supabase
        .from('decklists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDecklists(data || []);
    } catch (error) {
      console.error('Error loading decklists:', error);
    }
  };

  const addDecklist = async (decklist) => {
    try {
      const { data, error } = await supabase
        .from('decklists')
        .insert([{
          name: decklist.name,
          cards: decklist.cards,
          total_cards: decklist.totalCards
        }])
        .select();
      
      if (error) throw error;
      await loadDecklists();
    } catch (error) {
      console.error('Error adding decklist:', error);
      alert('Failed to save decklist');
    }
  };

  const deleteDecklist = async (id) => {
    if (!confirm('Delete this decklist template?')) return;
    
    try {
      const { error } = await supabase
        .from('decklists')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadDecklists();
    } catch (error) {
      console.error('Error deleting decklist:', error);
      alert('Failed to delete decklist');
    }
  };

  const loadContainers = async () => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setContainers(data || []);
    } catch (error) {
      console.error('Error loading containers:', error);
    }
  };

  const addContainer = async (container) => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .insert([{
          name: container.name,
          decklist_id: container.decklistId,
          decklist_name: container.decklistName,
          cards: container.cards
        }])
        .select();
      
      if (error) throw error;
      await loadContainers();
    } catch (error) {
      console.error('Error adding container:', error);
      alert('Failed to create container');
    }
  };

  const deleteContainerFromDB = async (containerId) => {
    const container = containers.find(c => c.id === containerId);
    if (!container || !confirm(`Delete "${container.name}"? Cards return to inventory.`)) return;

    try {
      for (const card of container.cards) {
        const existingCard = inventory.find(
          i => i.name.toLowerCase() === card.cardName.toLowerCase() &&
               i.set_name === card.setName
        );
        
        if (existingCard) {
          await updateInventoryQuantity(existingCard.id, existingCard.quantity + card.quantity);
        }
      }

      const { error } = await supabase
        .from('containers')
        .delete()
        .eq('id', containerId);
      
      if (error) throw error;
      await loadContainers();
      await loadInventory();
    } catch (error) {
      console.error('Error deleting container:', error);
      alert('Failed to delete container');
    }
  };

  const loadReorderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'reorder_settings')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setReorderSettings(data.value);
    } catch (error) {
      console.error('Error loading reorder settings:', error);
    }
  };

  const saveReorderSettings = async (settings) => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'reorder_settings',
          value: settings
        });
      
      if (error) throw error;
      setReorderSettings(settings);
    } catch (error) {
      console.error('Error saving reorder settings:', error);
    }
  };

  const loadUsageHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('usage_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      setUsageHistory(data || []);
    } catch (error) {
      console.error('Error loading usage history:', error);
    }
  };

  const recordUsage = async (cardName, setName, quantity) => {
    try {
      const { error } = await supabase
        .from('usage_history')
        .insert([{
          card_name: cardName,
          set_name: setName,
          quantity: quantity,
          timestamp: Date.now()
        }]);
      
      if (error) throw error;
      await loadUsageHistory();
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  const calculateParValue = (cardName) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = usageHistory.filter(h => 
      h.card_name.toLowerCase() === cardName.toLowerCase() && 
      h.timestamp >= thirtyDaysAgo
    );

    const usedInContainers = containers.filter(c => 
      c.cards.some(card => card.cardName.toLowerCase() === cardName.toLowerCase())
    );

    if (usedInContainers.length === 0) return 0;

    const usageFrequency = recentHistory.reduce((sum, h) => sum + h.quantity, 0);
    const dependencyCount = usedInContainers.length;
    const avgUsagePerDeck = usedInContainers.reduce((sum, c) => {
      const card = c.cards.find(card => card.cardName.toLowerCase() === cardName.toLowerCase());
      return sum + (card ? card.quantity : 0);
    }, 0) / usedInContainers.length;

    const depletionRate = usageFrequency / 30;
    const safetyBuffer = Math.ceil(avgUsagePerDeck * Math.sqrt(dependencyCount));
    const parValue = Math.ceil((depletionRate * 7) + safetyBuffer);

    return Math.max(parValue, avgUsagePerDeck * dependencyCount);
  };

  const getColorIdentity = (container) => {
    const colors = new Set();
    container.cards.forEach(card => {
      const name = card.cardName.toLowerCase();
      if (name.includes('plains') || name.includes('white')) colors.add('W');
      if (name.includes('island') || name.includes('blue')) colors.add('U');
      if (name.includes('swamp') || name.includes('black')) colors.add('B');
      if (name.includes('mountain') || name.includes('red')) colors.add('R');
      if (name.includes('forest') || name.includes('green')) colors.add('G');
    });

    const colorArray = Array.from(colors).sort();
    if (colorArray.length === 0) return 'Colorless';
    if (colorArray.length === 1) {
      const map = {'W': 'White', 'U': 'Blue', 'B': 'Black', 'R': 'Red', 'G': 'Green'};
      return map[colorArray[0]];
    }
    
    const guilds = {
      'UW': 'Azorius', 'WB': 'Orzhov', 'BR': 'Rakdos', 'RG': 'Gruul', 'GU': 'Simic',
      'BU': 'Dimir', 'RU': 'Izzet', 'GW': 'Selesnya', 'RW': 'Boros', 'BG': 'Golgari'
    };

    return guilds[colorArray.join('')] || `${colorArray.length}-Color`;
  };

  const groupContainersByColor = () => {
    const grouped = {};
    containers.forEach(container => {
      const identity = getColorIdentity(container);
      if (!grouped[identity]) grouped[identity] = [];
      grouped[identity].push(container);
    });

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  };

  const getMostCommonCards = () => {
    const cardCount = {};
    containers.forEach(container => {
      container.cards.forEach(card => {
        const key = card.cardName.toLowerCase();
        cardCount[key] = (cardCount[key] || 0) + 1;
      });
    });

    return Object.entries(cardCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  };

  const findSharedCards = (decklistId) => {
    const decklist = decklists.find(d => d.id === decklistId);
    if (!decklist) return { templates: [], containers: [] };

    const deckCards = new Set(decklist.cards.map(c => c.cardName.toLowerCase()));

    const sharedTemplates = decklists
      .filter(d => d.id !== decklistId)
      .map(d => {
        const shared = d.cards.filter(c => deckCards.has(c.cardName.toLowerCase()));
        return { name: d.name, count: shared.length };
      })
      .filter(s => s.count > 0);

    const sharedContainers = containers.map(c => {
      const shared = c.cards.filter(card => deckCards.has(card.cardName.toLowerCase()));
      return { name: c.name, count: shared.length };
    }).filter(s => s.count > 0);

    return { templates: sharedTemplates, containers: sharedContainers };
  };

  const estimateCardKingdomPrice = (cards) => {
    return cards.reduce((sum, card) => {
      const invCard = inventory.find(i => i.name.toLowerCase() === card.cardName.toLowerCase());
      return sum + (card.quantity * (invCard?.card_kingdom_price || 0));
    }, 0);
  };

  const estimateTCGPlayerPrice = (cards) => {
    return cards.reduce((sum, card) => {
      const invCard = inventory.find(i => i.name.toLowerCase() === card.cardName.toLowerCase());
      return sum + (card.quantity * (invCard?.tcgplayer_price || 0));
    }, 0);
  };

  const calculateBuildCost = (cards) => {
    return cards.reduce((sum, card) => {
      const invCard = inventory.find(i => 
        i.name.toLowerCase() === card.cardName.toLowerCase()
      );
      return sum + (card.quantity * (invCard?.purchase_price || 0));
    }, 0);
  };

  const parseArchidektDecklist = (text) => {
    const lines = text.split('\n');
    const cards = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^(\d+)x?\s+(.+?)(?:\s+\([A-Z0-9]+\).*)?$/);
      if (match) {
        cards.push({ quantity: parseInt(match[1]), cardName: match[2].trim() });
      }
    }
    
    return cards;
  };

  const saveDecklistTemplate = async () => {
    if (!decklistName.trim() || !decklistPaste.trim()) {
      alert('Please provide both a name and decklist');
      return;
    }

    const parsedCards = parseArchidektDecklist(decklistPaste);
    if (parsedCards.length === 0) {
      alert('No valid cards found in decklist');
      return;
    }

    await addDecklist({
      name: decklistName,
      cards: parsedCards,
      totalCards: parsedCards.reduce((sum, card) => sum + card.quantity, 0)
    });
    
    setDecklistName('');
    setDecklistPaste('');
    setShowDecklistForm(false);
  };

  const initiateContainerCreation = () => {
    if (!containerName.trim() || !selectedDecklist) {
      alert('Please provide a container name and select a decklist');
      return;
    }

    const decklist = decklists.find(d => d.id === selectedDecklist);
    if (!decklist) return;

    const cardsNeedingSetSelection = [];
    
    for (const card of decklist.cards) {
      const matchingCards = inventory.filter(
        i => i.name.toLowerCase() === card.cardName.toLowerCase()
      );
      
      const totalAvailable = matchingCards.reduce((sum, c) => sum + c.quantity, 0);
      
      if (totalAvailable < card.quantity) {
        alert(`Insufficient inventory for ${card.cardName}: need ${card.quantity}, have ${totalAvailable}`);
        return;
      }
      
      if (matchingCards.length > 1) {
        cardsNeedingSetSelection.push({
          cardName: card.cardName,
          quantity: card.quantity,
          availableSets: matchingCards
        });
      }
    }

    if (cardsNeedingSetSelection.length > 0) {
      setSetSelectionData({
        containerName,
        decklistId: selectedDecklist,
        cardsToSelect: cardsNeedingSetSelection,
        currentIndex: 0,
        selections: []
      });
      setShowSetSelector(true);
    } else {
      createContainer();
    }
  };

  const handleSetSelection = (inventoryItem) => {
    const newSelections = [...setSelectionData.selections, {
      cardName: setSelectionData.cardsToSelect[setSelectionData.currentIndex].cardName,
      quantity: setSelectionData.cardsToSelect[setSelectionData.currentIndex].quantity,
      inventoryId: inventoryItem.id,
      setName: inventoryItem.set_name
    }];

    if (setSelectionData.currentIndex < setSelectionData.cardsToSelect.length - 1) {
      setSetSelectionData({
        ...setSelectionData,
        currentIndex: setSelectionData.currentIndex + 1,
        selections: newSelections
      });
    } else {
      createContainerWithSelections(newSelections);
      setShowSetSelector(false);
      setSetSelectionData(null);
    }
  };

  const createContainerWithSelections = async (selections) => {
    const decklist = decklists.find(d => d.id === selectedDecklist);
    if (!decklist) return;

    try {
      for (const selection of selections) {
        const item = inventory.find(i => i.id === selection.inventoryId);
        if (item) {
          await updateInventoryQuantity(item.id, item.quantity - selection.quantity);
          await recordUsage(item.name, item.set_name, selection.quantity);
        }
      }

      await addContainer({
        name: containerName,
        decklistId: decklist.id,
        decklistName: decklist.name,
        cards: decklist.cards.map(card => {
          const selection = selections.find(s => s.cardName === card.cardName);
          return { ...card, setName: selection?.setName || 'Unknown' };
        })
      });

      setContainerName('');
      setSelectedDecklist(null);
      setShowContainerForm(false);
    } catch (error) {
      console.error('Error creating container:', error);
      alert('Failed to create container');
    }
  };

  const createContainer = async () => {
    const decklist = decklists.find(d => d.id === selectedDecklist);
    if (!decklist) return;

    try {
      for (const card of decklist.cards) {
        let remaining = card.quantity;
        for (const invCard of inventory) {
          if (invCard.name.toLowerCase() === card.cardName.toLowerCase() && remaining > 0) {
            const toDeduct = Math.min(invCard.quantity, remaining);
            await updateInventoryQuantity(invCard.id, invCard.quantity - toDeduct);
            await recordUsage(invCard.name, invCard.set_name, toDeduct);
            remaining -= toDeduct;
          }
        }
      }

      await addContainer({
        name: containerName,
        decklistId: decklist.id,
        decklistName: decklist.name,
        cards: decklist.cards
      });

      setContainerName('');
      setSelectedDecklist(null);
      setShowContainerForm(false);
    } catch (error) {
      console.error('Error creating container:', error);
      alert('Failed to create container');
    }
  };

  const duplicateContainer = async (containerId) => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return;

    const canDuplicate = container.cards.every(card => {
      const matchingCards = inventory.filter(i => 
        i.name.toLowerCase() === card.cardName.toLowerCase() &&
        i.set_name === card.setName
      );
      return matchingCards.reduce((sum, c) => sum + c.quantity, 0) >= card.quantity;
    });

    if (!canDuplicate) {
      alert('Insufficient inventory with matching sets to duplicate');
      return;
    }

    const newName = prompt(`Name for duplicated container:`, `${container.name} (Copy)`);
    if (!newName) return;

    try {
      for (const card of container.cards) {
        let remaining = card.quantity;
        for (const invCard of inventory) {
          if (invCard.name.toLowerCase() === card.cardName.toLowerCase() && 
              invCard.set_name === card.setName && 
              remaining > 0) {
            const toDeduct = Math.min(invCard.quantity, remaining);
            await updateInventoryQuantity(invCard.id, invCard.quantity - toDeduct);
            await recordUsage(invCard.name, invCard.set_name, toDeduct);
            remaining -= toDeduct;
          }
        }
      }

      await addContainer({
        name: newName,
        decklistId: container.decklist_id,
        decklistName: container.decklist_name,
        cards: container.cards
      });
    } catch (error) {
      console.error('Error duplicating container:', error);
      alert('Failed to duplicate container');
    }
  };

  const searchCards = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      setSelectedCardSets([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name&unique=prints`);
      const data = await response.json();
      
      if (data.object === 'list' && data.data?.length > 0) {
        setSearchResults(data.data.slice(0, 30));
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowDropdown(false);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchCards(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectCardForInventory = (card) => {
    const cardSets = searchResults.filter(c => c.name === card.name);
    if (cardSets.length > 1) {
      setSelectedCardSets(cardSets);
      setNewEntry({ ...newEntry, selectedSet: null });
    } else {
      setNewEntry({ ...newEntry, selectedSet: card });
      setSelectedCardSets([]);
    }
  };

  const addToInventory = async () => {
    const card = newEntry.selectedSet;
    if (!card) {
      alert('Please select a card and set');
      return;
    }

    const prices = card.prices || {};
    const cardKingdomPrice = parseFloat(prices.usd) || 0;
    const tcgplayerPrice = parseFloat(prices.usd) || 0;

    await addInventoryItem({
      cardId: card.id,
      name: card.name,
      setName: card.set_name,
      setCode: card.set,
      imageUrl: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small,
      quantity: newEntry.quantity,
      purchaseDate: newEntry.purchaseDate,
      purchasePrice: parseFloat(newEntry.purchasePrice) || 0,
      reorderType: newEntry.reorderType,
      cardKingdomPrice: cardKingdomPrice,
      tcgplayerPrice: tcgplayerPrice,
      scryfallUri: card.scryfall_uri
    });
    
    setSearchQuery('');
    setShowDropdown(false);
    setSelectedCardSets([]);
    setNewEntry({
      quantity: 1,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      reorderType: 'normal',
      selectedSet: null
    });
  };

  const removeFromInventory = async (id) => {
    await removeInventoryItem(id);
  };

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
  const totalCKValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.card_kingdom_price || 0)), 0);
  const totalTCGValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.tcgplayer_price || 0)), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MTG Card Manager</h1>
          <div className="flex gap-2">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Settings size={18} />
              Settings
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-800">Loading team data...</p>
          </div>
        )}

        {showSettings && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Reorder Quantity Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Reorder Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={reorderSettings.bulk}
                    onChange={(e) => saveReorderSettings({...reorderSettings, bulk: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land Reorder Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={reorderSettings.land}
                    onChange={(e) => saveReorderSettings({...reorderSettings, land: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Normal Reorder Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={reorderSettings.normal}
                    onChange={(e) => saveReorderSettings({...reorderSettings, normal: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            {['inventory', 'decklists',
'containers', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'inventory' && <Package className="inline mr-2" size={18} />}
                {tab === 'decklists' && <FileText className="inline mr-2" size={18} />}
                {tab === 'containers' && <Layers className="inline mr-2" size={18} />}
                {tab === 'analytics' && <TrendingUp className="inline mr-2" size={18} />}
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {showSetSelector && setSelectionData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-xl font-semibold mb-2">
                Select Set for {setSelectionData.cardsToSelect[setSelectionData.currentIndex].cardName}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Need {setSelectionData.cardsToSelect[setSelectionData.currentIndex].quantity} copies
                ({setSelectionData.currentIndex + 1} of {setSelectionData.cardsToSelect.length})
              </p>
              <div className="space-y-2">
                {setSelectionData.cardsToSelect[setSelectionData.currentIndex].availableSets.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSetSelection(item)}
                    className="w-full p-4 border rounded-lg hover:bg-blue-50 text-left"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{item.set_name}</div>
                        <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                      </div>
                      <div className="text-sm">${item.purchase_price.toFixed(2)}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowSetSelector(false);
                  setSetSelectionData(null);
                }}
                className="mt-4 px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Add Card</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Card</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Type card name..."
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                      {searchResults.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => selectCardForInventory(card)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b flex items-center gap-3"
                        >
                          {card.image_uris?.small && (
                            <img src={card.image_uris.small} alt={card.name} className="w-12 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{card.name}</div>
                            <div className="text-sm text-gray-500">{card.set_name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCardSets.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Set</label>
                    <select
                      onChange={(e) => {
                        const card = selectedCardSets.find(c => c.id === e.target.value);
                        setNewEntry({...newEntry, selectedSet: card});
                      }}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="">Choose a set...</option>
                      {selectedCardSets.map(card => (
                        <option key={card.id} value={card.id}>{card.set_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newEntry.quantity}
                      onChange={(e) => setNewEntry({...newEntry, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={newEntry.purchaseDate}
                      onChange={(e) => setNewEntry({...newEntry, purchaseDate: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newEntry.purchasePrice}
                      onChange={(e) => setNewEntry({...newEntry, purchasePrice: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Type</label>
                    <select
                      value={newEntry.reorderType}
                      onChange={(e) => setNewEntry({...newEntry, reorderType: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="normal">Normal</option>
                      <option value="bulk">Bulk</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={addToInventory}
                  disabled={!newEntry.selectedSet}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Add to Inventory
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Inventory ({inventory.length} cards)</h2>
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-600">Purchase: ${totalValue.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Market Value: ${totalCKValue.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">TCGplayer: ${totalTCGValue.toFixed(2)}</div>
                </div>
              </div>
              
              {inventory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No cards yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Card</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Set</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Par</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Purchase</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Market</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventory.map((item) => {
                        const parValue = calculateParValue(item.name);
                        const needsReorder = parValue > 0 && item.quantity <= parValue;
                        return (
                          <tr key={item.id} className={needsReorder ? 'bg-yellow-50' : ''}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {item.image_url && <img src={item.image_url} alt={item.name} className="w-10 rounded" />}
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{item.set_name}</td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3 capitalize">{item.reorder_type}</td>
                            <td className="px-4 py-3">
                              {needsReorder ? (
                                <span className="text-orange-600 font-medium flex items-center gap-1">
                                  <AlertCircle size={14} />
                                  {parValue}
                                </span>
                              ) : parValue}
                            </td>
                            <td className="px-4 py-3">${item.purchase_price.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <div>${(item.card_kingdom_price || 0).toFixed(2)}</div>
                              <div className="text-xs text-gray-500">${(item.tcgplayer_price || 0).toFixed(2)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => removeFromInventory(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'decklists' && (
          <>
            <button
              onClick={() => setShowDecklistForm(!showDecklistForm)}
              className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              New Template
            </button>

            {showDecklistForm && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Import Decklist</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={decklistName}
                      onChange={(e) => setDecklistName(e.target.value)}
                      placeholder="My Deck"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paste Decklist</label>
                    <textarea
                      value={decklistPaste}
                      onChange={(e) => setDecklistPaste(e.target.value)}
                      placeholder="4 Lightning Bolt&#10;2 Counterspell"
                      rows="10"
                      className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: "4 Card Name" or "4x Card Name"</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveDecklistTemplate} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Save
                    </button>
                    <button onClick={() => setShowDecklistForm(false)} className="px-4 py-2 bg-gray-300 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {decklists.map((deck) => {
                const shared = findSharedCards(deck.id);
                const ckPrice = estimateCardKingdomPrice(deck.cards);
                const tcgPrice = estimateTCGPlayerPrice(deck.cards);
                const buildCost = calculateBuildCost(deck.cards);
                
                return (
                  <div key={deck.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{deck.name}</h3>
                        <p className="text-sm text-gray-500">{deck.total_cards} cards</p>
                      </div>
                      <button onClick={() => deleteDecklist(deck.id)} className="text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <div className="text-gray-500">Market Value</div>
                        <div className="font-semibold">${ckPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">TCGplayer</div>
                        <div className="font-semibold">${tcgPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Your Cost</div>
                        <div className="font-semibold">${buildCost.toFixed(2)}</div>
                      </div>
                    </div>

                    {(shared.templates.length > 0 || shared.containers.length > 0) && (
                      <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                        <div className="font-medium mb-1">Shared Cards:</div>
                        {shared.templates.length > 0 && (
                          <div className="text-gray-700">
                            Templates: {shared.templates.map(s => `${s.name} (${s.count})`).join(', ')}
                          </div>
                        )}
                        {shared.containers.length > 0 && (
                          <div className="text-gray-700">
                            Containers: {shared.containers.map(s => `${s.name} (${s.count})`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    <details>
                      <summary className="cursor-pointer text-sm text-blue-600">View cards</summary>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {deck.cards.map((card, idx) => (
                          <div key={idx}>{card.quantity}x {card.cardName}</div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'containers' && (
          <>
            <button
              onClick={() => setShowContainerForm(!showContainerForm)}
              className="mb-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Copy size={20} />
              Build Deck
            </button>

            {showContainerForm && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Build Physical Deck</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Container Name</label>
                    <input
                      type="text"
                      value={containerName}
                      onChange={(e) => setContainerName(e.target.value)}
                      placeholder="Deck Box 1"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                    <select
                      value={selectedDecklist || ''}
                      onChange={(e) => setSelectedDecklist(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="">Choose...</option>
                      {decklists.map((deck) => (
                        <option key={deck.id} value={deck.id}>{deck.name} ({deck.total_cards})</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                    Building deducts cards from inventory
                  </div>
                  <div className="flex gap-2">
                    <button onClick={initiateContainerCreation} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Build
                    </button>
                    <button onClick={() => setShowContainerForm(false)} className="px-4 py-2 bg-gray-300 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {Object.entries(groupContainersByColor()).map(([color, colorContainers]) => (
              <div key={color} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">{color}</h3>
                <div className="space-y-4">
                  {colorContainers.map((container) => {
                    const ckPrice = estimateCardKingdomPrice(container.cards);
                    const tcgPrice = estimateTCGPlayerPrice(container.cards);
                    const buildCost = calculateBuildCost(container.cards);
                    const profit = ckPrice - buildCost;
                    const profitMargin = buildCost > 0 ? ((profit / buildCost) * 100) : 0;
                    
                    return (
                      <div key={container.id} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-semibold">{container.name}</h4>
                            <p className="text-sm text-gray-500">
                              Template: {container.decklist_name}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => duplicateContainer(container.id)} className="text-blue-600" title="Duplicate">
                              <Copy size={18} />
                            </button>
                            <button onClick={() => deleteContainerFromDB(container.id)} className="text-red-600">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
                          <div>
                            <div className="text-gray-500">Market Value</div>
                            <div className="font-semibold">${ckPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">TCGplayer</div>
                            <div className="font-semibold">${tcgPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Your Cost</div>
                            <div className="font-semibold">${buildCost.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Est. Profit</div>
                            <div className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Margin</div>
                            <div className={`font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <details>
                          <summary className="cursor-pointer text-sm text-blue-600">View cards</summary>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            {container.cards.map((card, idx) => (
                              <div key={idx}>{card.quantity}x {card.cardName}</div>
                            ))}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Most Common Cards</h2>
              <div className="space-y-2">
                {getMostCommonCards().map((card, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium capitalize">{card.name}</span>
                    <span className="text-gray-600">Used in {card.count} decks</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Reorder Alerts</h2>
              <div className="space-y-2">
                {inventory.filter(item => {
                  const parValue = calculateParValue(item.name);
                  return parValue > 0 && item.quantity <= parValue;
                }).map(item => {
                  const parValue = calculateParValue(item.name);
                  const reorderQty = reorderSettings[item.reorder_type];
                  return (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-orange-50 rounded">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          Current: {item.quantity} | Par: {parValue} | Reorder: {reorderQty}
                        </div>
                      </div>
                      <AlertCircle className="text-orange-600" size={20} />
                    </div>
                  );
                })}
                {inventory.filter(item => {
                  const parValue = calculateParValue(item.name);
                  return parValue > 0 && item.quantity <= parValue;
                }).length === 0 && (
                  <div className="text-center text-gray-500 py-4">No reorder alerts</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}