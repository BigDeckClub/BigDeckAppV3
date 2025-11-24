import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, FileText, Package, Copy, Layers, AlertCircle, TrendingUp, Settings, RefreshCw, DollarSign, X } from 'lucide-react';
import { fetchCardPrices } from './utils/priceUtils';
import { useDebounce } from './utils/useDebounce';
import { InventoryTab } from './components/InventoryTab';

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
  const [expandedContainers, setExpandedContainers] = useState({});
  const [containerItems, setContainerItems] = useState({});
  const [defaultSearchSet, setDefaultSearchSet] = useState('');
  const [allSets, setAllSets] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [decklistPrices, setDecklistPrices] = useState({});
  const [containerPriceCache, setContainerPriceCache] = useState({});
  const [expandedDecklists, setExpandedDecklists] = useState({});
  const [editingDecklistCard, setEditingDecklistCard] = useState(null);
  const [editCardSet, setEditCardSet] = useState('');
  const [editCardAvailableSets, setEditCardAvailableSets] = useState([]);
  const [lastUsedSets, setLastUsedSets] = useState({});

  // Price display component
  const MarketPrices = ({ cardName, setCode }) => {
    const [prices, setPrices] = useState(null);
    
    useEffect(() => {
      const cacheKey = `${cardName}|${setCode}`;
      if (priceCache[cacheKey]) {
        setPrices(priceCache[cacheKey]);
      } else {
        const loadPrices = async () => {
          const priceData = await fetchCardPrices(cardName, setCode);
          setPrices(priceData);
          setPriceCache(prev => ({...prev, [cacheKey]: priceData}));
        };
        loadPrices();
      }
    }, [cardName, setCode]);
    
    if (!prices) return <div className="text-xs text-slate-500">Loading...</div>;
    return (
      <div className="text-xs whitespace-nowrap">
        <div className="text-teal-300">TCG: {prices.tcg}</div>
        <div className="text-cyan-300">CK: {prices.ck}</div>
      </div>
    );
  };

  // Individual card price component for decklist views
  const DecklistCardPrice = ({ cardName, setCode }) => {
    const [tcgPrice, setTcgPrice] = useState('N/A');
    const [ckPrice, setCkPrice] = useState('N/A');
    
    useEffect(() => {
      let isMounted = true;
      const cacheKey = `${cardName}|${setCode}`;
      const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
      
      // Check cache first
      if (priceCache[cacheKey]) {
        const cached = priceCache[cacheKey];
        const now = Date.now();
        // Check if cache is still valid
        if (now - (cached.timestamp || 0) < CACHE_DURATION_MS) {
          if (isMounted) {
            setTcgPrice(cached.tcg);
            setCkPrice(cached.ck);
          }
          return;
        }
      }
      
      const loadPrices = async () => {
        const priceData = await fetchCardPrices(cardName, setCode);
        if (isMounted) {
          setPriceCache(prev => ({...prev, [cacheKey]: { ...priceData, timestamp: Date.now() }}));
          setTcgPrice(priceData.tcg);
          setCkPrice(priceData.ck);
        }
      };
      
      loadPrices();
      return () => { isMounted = false; };
    }, [cardName, setCode]);
    
    return (
      <div className="text-xs flex gap-4 mt-2">
        <div className="text-teal-300">TCG: {tcgPrice}</div>
        <div className="text-cyan-300">CK: {ckPrice}</div>
      </div>
    );
  };

  const calculateDecklistPrices = async (decklist) => {
    try {
      const lines = decklist.split('\n');
      let tcgTotal = 0, ckTotal = 0;
      
      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
        if (!match) continue;
        
        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();
        const setFromDecklist = match[3];
        
        try {
          let tcgPrice = 0, ckPrice = 0;
          let setToUse = setFromDecklist;
          
          // If no set in decklist, try to find from inventory
          if (!setToUse) {
            const inventoryCard = inventory.find(card => card.name.toLowerCase() === cardName.toLowerCase());
            if (inventoryCard) {
              setToUse = inventoryCard.set;
            }
          }
          
          if (setToUse) {
            // Use the set code we found
            const response = await fetch(`${API_BASE}/prices/${encodeURIComponent(cardName)}/${setToUse}`);
            if (response.ok) {
              const priceData = await response.json();
              // Strip $ sign and parse the price
              tcgPrice = parseFloat(String(priceData.tcg).replace('$', '')) || 0;
              const ckRaw = String(priceData.ck).replace('$', '');
              ckPrice = parseFloat(ckRaw) || 0;
              
              // If CK price is N/A or 0, use fallback
              if (ckPrice === 0 && tcgPrice > 0) {
                ckPrice = tcgPrice * 1.15;
              }
            }
          } else {
            // Card not in inventory - find set from Scryfall and use backend API for CK widget
            try {
              const scryfallUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints&order=released`;
              const scryfallResponse = await fetch(scryfallUrl);
              if (scryfallResponse.ok) {
                const scryfallData = await scryfallResponse.json();
                if (scryfallData.data && scryfallData.data.length > 0) {
                  // Try to find a set with good CK data
                  let foundPrice = false;
                  let bestTcgPrice = 0;
                  
                  for (const card of scryfallData.data.slice(0, 10)) {
                    // Get TCG price from Scryfall
                    const currentTcgPrice = parseFloat(card.prices?.usd) || 0;
                    if (currentTcgPrice > 0) {
                      bestTcgPrice = currentTcgPrice;
                      tcgPrice = currentTcgPrice;
                    }
                    
                    if (card.set) {
                      // Try backend API to get CK widget price
                      try {
                        const backendResponse = await fetch(`${API_BASE}/prices/${encodeURIComponent(cardName)}/${card.set}`);
                        if (backendResponse.ok) {
                          const backendData = await backendResponse.json();
                          const ckRaw = String(backendData.ck).replace('$', '');
                          const potentialCkPrice = parseFloat(ckRaw) || 0;
                          // Only consider this a success if we got a real CK price (not 0 or N/A)
                          if (potentialCkPrice > 0) {
                            ckPrice = potentialCkPrice;
                            foundPrice = true;
                            break;
                          }
                        }
                      } catch (err) {
                        // Continue to next set
                      }
                    }
                  }
                  
                  // Fallback if CK widget price not found - use TCG * 1.15
                  if (!foundPrice && tcgPrice > 0) {
                    ckPrice = tcgPrice * 1.15;
                  }
                }
              }
            } catch (err) {

            }
          }
          
          tcgTotal += tcgPrice * quantity;
          ckTotal += ckPrice * quantity;
        } catch (err) {

        }
      }
      
      return { tcg: tcgTotal, ck: ckTotal };
    } catch (err) {

      return { tcg: 0, ck: 0 };
    }
  };

  const calculateContainerMarketPrices = async (containerId) => {
    const items = containerItems[containerId] || [];
    let tcgTotal = 0, ckTotal = 0;
    
    for (const item of items) {
      try {
        // Use the backend API which has proper pricing with CK data
        const response = await fetch(`${API_BASE}/prices/${encodeURIComponent(item.name)}/${item.set}`);
        if (response.ok) {
          const priceData = await response.json();
          // Strip $ sign and parse the price
          const tcgPrice = parseFloat(String(priceData.tcg).replace('$', '')) || 0;
          const ckRaw = String(priceData.ck).replace('$', '');
          let ckPrice = parseFloat(ckRaw) || 0;
          
          // If CK price is N/A or 0, use fallback
          if (ckPrice === 0 && tcgPrice > 0) {
            ckPrice = tcgPrice * 1.15;
          }
          
          const quantity = parseInt(item.quantity_used) || 0;
          tcgTotal += tcgPrice * quantity;
          ckTotal += ckPrice * quantity;
        }
      } catch (err) {

      }
    }
    
    return { tcg: tcgTotal, ck: ckTotal };
  };

  useEffect(() => {
    loadAllData();
    loadAllSets();
    const saved = localStorage.getItem('defaultSearchSet');
    if (saved) setDefaultSearchSet(saved);
  }, []);

  useEffect(() => {
    const calculateAllDecklistPrices = async () => {
      const prices = {};
      for (const deck of decklists) {
        prices[deck.id] = await calculateDecklistPrices(deck.decklist);
      }
      setDecklistPrices(prices);
    };
    if (decklists.length > 0) {
      calculateAllDecklistPrices();
    }
  }, [decklists, inventory]);

  useEffect(() => {
    const calculateAllContainerPrices = async () => {
      const prices = {};
      for (const containerId of Object.keys(containerItems)) {
        prices[containerId] = await calculateContainerMarketPrices(parseInt(containerId));
      }
      setContainerPriceCache(prices);
    };
    if (Object.keys(containerItems).length > 0) {
      calculateAllContainerPrices();
    }
  }, [containerItems]);

  const loadAllSets = async () => {
    try {
      const response = await fetch('https://api.scryfall.com/sets');
      if (response.ok) {
        const data = await response.json();
        const sets = data.data
          .map(set => ({
            code: set.code.toUpperCase(),
            name: set.name
          }))
          .sort((a, b) => a.code.localeCompare(b.code));
        setAllSets(sets);
      }
    } catch (error) {

    }
  };

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

      const response = await fetch(`${API_BASE}/inventory`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setInventory(data || []);
    } catch (error) {

    }
  };

  const addInventoryItem = async (item) => {
    try {

      const response = await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      await loadInventory();
      setSuccessMessage('Card added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      return true;
    } catch (error) {

      setSuccessMessage('Error adding card: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 3000);
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

      alert('Error updating card: ' + error.message);
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' });
      await loadInventory();
    } catch (error) {

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
      
      const prioritized = [];
      const seen = new Set();
      
      const inventoryByName = {};
      inventory.forEach(item => {
        if (!inventoryByName[item.name]) {
          inventoryByName[item.name] = [];
        }
        inventoryByName[item.name].push({
          set: item.set,
          setName: item.set_name,
          purchaseDate: item.purchase_date
        });
      });
      
      Object.keys(inventoryByName).forEach(cardName => {
        inventoryByName[cardName].sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
      });
      
      // First, if default set is selected, show matches from that set
      if (defaultSearchSet) {
        cards.forEach(card => {
          if (!seen.has(`${card.name}|${card.set}`) && card.set === defaultSearchSet) {
            prioritized.push(card);
            seen.add(`${card.name}|${card.set}`);
          }
        });
      }
      
      // Then add prioritized inventory cards (most recent 2 sets)
      cards.forEach(card => {
        if (!seen.has(`${card.name}|${card.set}`) && inventoryByName[card.name]) {
          const inventoryVariants = inventoryByName[card.name].slice(0, 2);
          if (inventoryVariants.some(v => v.set === card.set)) {
            prioritized.push(card);
            seen.add(`${card.name}|${card.set}`);
          }
        }
      });
      
      // Then add remaining cards
      cards.forEach(card => {
        if (!seen.has(`${card.name}|${card.set}`)) {
          prioritized.push(card);
          seen.add(`${card.name}|${card.set}`);
        }
      });
      
      setSearchResults(prioritized.slice(0, 10));
    } catch (error) {

      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      searchScryfall(debouncedQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const selectCard = async (card) => {
    // Fetch ALL printings of this card from Scryfall
    try {

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

        setSelectedCardSets(allVersions);
      } else {
        // Fallback to search results if API call fails
        const cardVersions = searchResults.filter(c => c.name === card.name);
        setSelectedCardSets(cardVersions.length > 0 ? cardVersions : [card]);
      }
    } catch (error) {

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

      // Parse decklist lines (format: "3 Card Name")
      lines.forEach(line => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const quantity = parseInt(match[1]);
          const cardName = match[2].trim();
          cardsToFind.push({ name: cardName, quantity });
        }
      });

      if (cardsToFind.length === 0) {
        alert('No cards found. Please use format: "3 Card Name"');
        setDeckPreviewLoading(false);
        return;
      }

      // Fetch from Scryfall for each card
      const previewCards = await Promise.all(cardsToFind.map(async (card) => {
        try {
          const query = `!"${card.name}"`;
          const scryfallRes = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`);
          
          if (!scryfallRes.ok) {
            return {
              cardName: card.name,
              quantity: card.quantity,
              found: false,
              error: `Card not found`
            };
          }

          const scryfallData = await scryfallRes.json();
          const cards = scryfallData.data || [];

          return {
            cardName: card.name,
            quantity: card.quantity,
            found: cards.length > 0,
            sets: cards.map(c => ({
              set: c.set.toUpperCase(),
              setName: c.set_name,
              rarity: c.rarity,
              price: c.prices?.usd || 'N/A'
            }))
          };
        } catch (err) {
          return {
            cardName: card.name,
            quantity: card.quantity,
            found: false,
            error: err.message
          };
        }
      }));

      setDeckPreview(previewCards);
    } catch (error) {

      alert('Error parsing decklist: ' + error.message);
    } finally {
      setDeckPreviewLoading(false);
    }
  };

  const validateDecklistCards = (preview) => {
    const missingCards = [];
    
    preview.forEach(card => {
      if (!card.found) {
        missingCards.push(card.cardName);
      }
    });
    
    if (missingCards.length > 0) {
      alert(`These cards were not found in Scryfall:\n${missingCards.join('\n')}`);
      return false;
    }
    
    return true;
  };

  const confirmAndAddDecklist = async () => {
    if (!deckPreview || !validateDecklistCards(deckPreview)) {
      return;
    }
    
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

      alert('Error adding decklist: ' + error.message);
    }
  };

  const deleteDecklist = async (id) => {
    try {
      await fetch(`${API_BASE}/decklists/${id}`, { method: 'DELETE' });
      await loadDecklists();
    } catch (error) {

    }
  };

  const loadContainers = async () => {
    try {
      const response = await fetch(`${API_BASE}/containers`);
      const data = await response.json();
      setContainers(data || []);
      
      // Preload all container items in the background
      if (data && data.length > 0) {
        const itemsMap = {};
        for (const container of data) {
          try {
            const itemResponse = await fetch(`${API_BASE}/containers/${container.id}/items`);
            const itemsData = await itemResponse.json();
            itemsMap[container.id] = itemsData || [];
          } catch (err) {

            itemsMap[container.id] = [];
          }
        }
        setContainerItems(itemsMap);
      }
    } catch (error) {

    }
  };

  const toggleContainerExpand = async (containerId) => {
    // Load items if not already loaded
    if (!containerItems[containerId]) {
      try {
        const response = await fetch(`${API_BASE}/containers/${containerId}/items`);
        const data = await response.json();
        setContainerItems(prev => ({
          ...prev,
          [containerId]: data || []
        }));
      } catch (error) {

      }
    }

    setExpandedContainers(prev => ({
      ...prev,
      [containerId]: !prev[containerId]
    }));
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

    }
  };

  const deleteContainer = async (id) => {
    try {
      await fetch(`${API_BASE}/containers/${id}`, { method: 'DELETE' });
      await loadContainers();
    } catch (error) {

    }
  };

  const loadSales = async () => {
    try {
      const response = await fetch(`${API_BASE}/sales`);
      const data = await response.json();
      setSales(data || []);
    } catch (error) {

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

  const calculateContainerPrices = (containerId) => {
    return containerPriceCache[containerId] || { tcg: 0, ck: 0 };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 hover:border-teal-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-300">MTG Card Manager</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 nav-tab inactive ${activeTab === 'inventory' ? 'btn-primary' : 'hover:shadow-lg'}`}
            >
              <Layers className="w-5 h-5 inline mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('decklists')}
              className={`px-4 py-2 nav-tab inactive ${activeTab === 'decklists' ? 'btn-primary' : 'hover:shadow-lg'}`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Decklists
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`px-4 py-2 nav-tab inactive ${activeTab === 'containers' ? 'btn-primary' : 'hover:shadow-lg'}`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Containers
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 nav-tab inactive ${activeTab === 'analytics' ? 'btn-primary' : 'hover:shadow-lg'}`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 nav-tab inactive ${activeTab === 'sales' ? 'btn-primary' : 'hover:shadow-lg'}`}
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Sales
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 rounded hover:shadow-lg transition"
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
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400" />
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && !isLoading && (
          <InventoryTab
            inventory={inventory}
            successMessage={successMessage}
            setSuccessMessage={setSuccessMessage}
            newEntry={newEntry}
            setNewEntry={setNewEntry}
            selectedCardSets={selectedCardSets}
            allSets={allSets}
            defaultSearchSet={defaultSearchSet}
            setDefaultSearchSet={setDefaultSearchSet}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            selectCard={selectCard}
            addCard={addCard}
            expandedCards={expandedCards}
            setExpandedCards={setExpandedCards}
            editingId={editingId}
            editForm={editForm}
            setEditForm={setEditForm}
            startEditingItem={startEditingItem}
            updateInventoryItem={updateInventoryItem}
            deleteInventoryItem={deleteInventoryItem}
            MarketPrices={MarketPrices}
            handleSearch={handleSearch}
          />
        )}

        {/* OLD INVENTORY CODE - REPLACED BY COMPONENT */}

        {/* Decklists Tab */}
        {activeTab === 'decklists' && !isLoading && (
          <div className="space-y-6 text-white">
            {!showDecklistForm ? (
              <button
                onClick={() => setShowDecklistForm(true)}
                className="btn-primary hover:shadow-lg rounded px-6 py-3 font-semibold transition"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Decklist
              </button>
            ) : (
              <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
                <h2 className="text-xl font-bold mb-4">Create Decklist</h2>
                <input
                  type="text"
                  placeholder="Decklist Name"
                  value={decklistName}
                  onChange={(e) => setDecklistName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white mb-4"
                />
                <textarea
                  placeholder="Paste decklist here (e.g., '2 Lightning Bolt')"
                  value={decklistPaste}
                  onChange={(e) => setDecklistPaste(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white mb-4 h-48"
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
                  <div className="mt-6 border-t border-slate-700 hover:border-teal-500 pt-4">
                    <h3 className="font-semibold mb-3">Decklist Preview</h3>
                    <div className="bg-slate-800 rounded p-4 max-h-96 overflow-y-auto space-y-2">
                      {deckPreview.map((card, idx) => (
                        <div key={idx} className={`p-2 rounded border-l-4 flex justify-between items-center ${card.found ? 'border-green-500 bg-emerald-900 bg-opacity-20' : 'border-red-600 bg-red-950 bg-opacity-20'}`}>
                          <span className="text-sm font-semibold">{card.quantity}x {card.cardName}</span>
                          <span className="text-xs">{card.found ? '✓ Found' : card.error || '✗ Not found'}</span>
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

            <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
              <h2 className="text-xl font-bold mb-4">Decklists ({decklists.length})</h2>
              <div className="grid gap-4 text-white">
                {decklists.map((deck) => {
                  const prices = decklistPrices[deck.id] || { tcg: 0, ck: 0 };
                  const isExpanded = expandedDecklists[deck.id];
                  const deckCards = deck.decklist.split('\n').filter(line => line.trim()).flatMap(line => {
                    const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                    if (!match) return [];
                    const quantity = parseInt(match[1]);
                    const name = match[2].trim();
                    const setCode = match[3] || null;
                    return Array.from({ length: quantity }, () => ({ name, setCode }));
                  }).filter(Boolean);
                  
                  return (
                    <div key={deck.id} className="bg-slate-800 border border-slate-600 rounded p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{deck.name}</div>
                          <div className="text-sm text-slate-300 mt-2">{deckCards.length} cards</div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setExpandedDecklists(prev => ({...prev, [deck.id]: !prev[deck.id]}))}
                            className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold"
                          >
                            {isExpanded ? 'Hide' : 'View'} Cards
                          </button>
                          <button
                            onClick={() => deleteDecklist(deck.id)}
                            className="bg-red-600 hover:bg-red-700 rounded px-3 py-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-700 hover:border-teal-500 pt-2 mt-2">
                        <div className="text-teal-300">TCG: ${prices.tcg.toFixed(2)}</div>
                        <div className="text-cyan-300">CK: ${prices.ck.toFixed(2)}</div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 border-t border-slate-700 hover:border-teal-500 pt-4">
                          <div className="space-y-3">
                            {deckCards.map((card, idx) => {
                              // Use set from decklist, fallback to inventory, then default
                              let cardSet = card.setCode;
                              if (!cardSet) {
                                const inventoryCard = inventory.find(inv => inv.name.toLowerCase() === card.name.toLowerCase());
                                cardSet = inventoryCard?.set || defaultSearchSet || 'UNK';
                              }
                              const isEditingThisCard = editingDecklistCard?.idx === idx && editingDecklistCard?.deckId === deck.id;
                              
                              return (
                                <div key={idx} className="card p-6 border rounded p-3">
                                  {isEditingThisCard ? (
                                    <div className="space-y-2">
                                      <select
                                        value={editCardSet}
                                        onChange={(e) => setEditCardSet(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-xs"
                                      >
                                        <option value="">Select a set...</option>
                                        {editCardAvailableSets.map((set) => (
                                          <option key={set.code} value={set.code}>
                                            {set.code.toUpperCase()} - {set.name}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            if (!editCardSet) {
                                              alert('Please select a set');
                                              return;
                                            }
                                            
                                            // Get the original lines (with quantities)
                                            const lines = deck.decklist.split('\n').filter(line => line.trim());
                                            
                                            // Find the line with this card and update its set code
                                            let found = false;
                                            let cardInstanceCount = 0;
                                            const newLines = lines.map(line => {
                                              const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                                              if (match) {
                                                const qty = match[1];
                                                const cardNamePart = match[2].trim();
                                                const existingSet = match[3];
                                                
                                                if (cardNamePart.toLowerCase() === card.name.toLowerCase()) {
                                                  // This is the card we're looking for
                                                  // Check if this is the instance we want to edit (idx is the individual card position)
                                                  if (cardInstanceCount + parseInt(qty) > idx && cardInstanceCount <= idx) {
                                                    found = true;
                                                    // Replace the entire line with updated set code
                                                    return `${qty} ${cardNamePart} (${editCardSet.toUpperCase()})`;
                                                  }
                                                  cardInstanceCount += parseInt(qty);
                                                }
                                              }
                                              return line;
                                            });
                                            
                                            if (found) {
                                              const newDecklistText = newLines.join('\n');
                                              
                                              fetch(`${API_BASE}/decklists/${deck.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ decklist: newDecklistText })
                                              }).then(() => {
                                                // Track last used set
                                                setLastUsedSets(prev => ({...prev, [card.name.toLowerCase()]: editCardSet}));
                                                loadDecklists();
                                                setEditingDecklistCard(null);
                                              }).catch(err => {

                                                alert('Failed to update decklist');
                                              });
                                            } else {
                                              alert('Could not find card in decklist');
                                            }
                                          }}
                                          className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-1 text-xs font-semibold"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingDecklistCard(null)}
                                          className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-2 py-1 text-xs font-semibold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <div className="font-semibold">{card.name}</div>
                                          <div className="text-xs text-slate-400">{cardSet.toUpperCase()}</div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            const lastSet = lastUsedSets[card.name.toLowerCase()];
                                            setEditingDecklistCard({ idx, deckId: deck.id });
                                            setEditCardSet(lastSet || cardSet);
                                            
                                            // Fetch available sets for this card
                                            try {
                                              const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(card.name)}"&unique=prints&order=released`);
                                              if (response.ok) {
                                                const data = await response.json();
                                                const sets = data.data?.map(card => ({
                                                  code: card.set.toUpperCase(),
                                                  name: card.set_name
                                                })) || [];
                                                // Remove duplicates, sort with last used first
                                                const uniqueSets = Array.from(new Map(sets.map(s => [s.code, s])).values());
                                                if (lastSet) {
                                                  uniqueSets.sort((a, b) => {
                                                    if (a.code === lastSet) return -1;
                                                    if (b.code === lastSet) return 1;
                                                    return 0;
                                                  });
                                                }
                                                setEditCardAvailableSets(uniqueSets);
                                              }
                                            } catch (error) {

                                              setEditCardAvailableSets([]);
                                            }
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs ml-2"
                                        >
                                          Edit Set
                                        </button>
                                      </div>
                                      <DecklistCardPrice cardName={card.name} setCode={cardSet} />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {decklists.length === 0 && <p className="text-slate-400">No decklists yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Containers Tab */}
        {activeTab === 'containers' && !isLoading && (
          <div className="space-y-6 text-white">
            {!showContainerForm ? (
              <button
                onClick={() => setShowContainerForm(true)}
                className="btn-primary hover:shadow-lg rounded px-6 py-3 font-semibold transition"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Container
              </button>
            ) : (
              <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
                <h2 className="text-xl font-bold mb-4">Create Container</h2>
                <input
                  type="text"
                  placeholder="Container Name"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white mb-4"
                />
                <select
                  value={selectedDecklist || ''}
                  onChange={(e) => setSelectedDecklist(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white mb-4"
                >
                  <option value="">Select a Decklist</option>
                  {decklists.map((deck) => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addContainer}
                    className="flex-1 btn-primary hover:shadow-lg rounded px-4 py-2 font-semibold"
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

            <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
              <h2 className="text-xl font-bold mb-4">Containers ({containers.length})</h2>
              <div className="space-y-3">
                {containers.map((container) => {
                  const containerPrices = calculateContainerPrices(container.id);
                  return (
                    <div key={container.id} className="bg-slate-800 border border-slate-600 rounded p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{container.name}</div>
                          <div className="text-sm text-slate-300">Decklist ID: {container.decklist_id}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2 text-slate-400">
                            <div className="text-teal-300">TCG: ${containerPrices.tcg.toFixed(2)}</div>
                            <div className="text-cyan-300">CK: ${containerPrices.ck.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleContainerExpand(container.id)}
                            className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold"
                          >
                            {expandedContainers[container.id] ? 'Hide' : 'View'} Contents
                          </button>
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

                    {expandedContainers[container.id] && (
                      <div className="mt-4 pt-4 border-t border-slate-700 hover:border-teal-500">
                        <h4 className="font-semibold mb-3">Cards in Container</h4>
                        {containerItems[container.id] && containerItems[container.id].length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {containerItems[container.id].map((item, idx) => (
                              <div key={idx} className="bg-slate-800 bg-opacity-50 border border-slate-600 rounded p-3 text-sm">
                                <div className="flex justify-between">
                                  <div>
                                    <div className="font-semibold">{item.name}</div>
                                    <div className="text-xs text-slate-400">{item.set_name} ({item.set})</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-teal-300 font-semibold">{item.quantity_used}x</div>
                                    <div className="text-xs text-slate-400">${item.purchase_price || 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">Loading container contents...</p>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
                {containers.length === 0 && <p className="text-slate-400">No containers yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && !isLoading && (
          <div className="space-y-6 text-white">
            <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-400" />
                Sales Analytics
              </h2>
              
              {sales.length > 0 ? (
                <div className="space-y-4">
                  {sales.map((sale) => {
                    const salePrice = parseFloat(sale.sale_price) || 0;
                    const deckCOGS = calculateDeckCOGS(sale.decklist_id);
                    const profit = salePrice - deckCOGS;
                    const profitPercentage = deckCOGS > 0 ? ((profit / deckCOGS) * 100).toFixed(2) : 0;
                    const container = containers.find(c => c.id === sale.container_id);
                    
                    return (
                      <div key={sale.id} className="bg-slate-800 border border-slate-600 rounded p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{container?.name || 'Unknown Container'}</div>
                            <div className="text-sm text-slate-400">{new Date(sale.sold_date).toLocaleDateString()}</div>
                          </div>
                          <div className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-300'}`}>
                            {profit >= 0 ? '+' : ''} ${profit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-slate-800 bg-opacity-50 border border-slate-600 rounded p-3">
                            <div className="text-slate-400 text-xs">COGS</div>
                            <div className="font-semibold text-teal-300">${deckCOGS.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-800 bg-opacity-50 border border-slate-600 rounded p-3">
                            <div className="text-slate-400 text-xs">Sale Price</div>
                            <div className="font-semibold text-cyan-300">${salePrice.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-800 bg-opacity-50 border border-slate-600 rounded p-3">
                            <div className="text-slate-400 text-xs">Profit %</div>
                            <div className={`font-semibold ${profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{profitPercentage}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-6 pt-6 border-t border-slate-700 hover:border-teal-500">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-800 bg-opacity-50 rounded p-4 border border-slate-600">
                        <div className="text-slate-400 text-sm">Total Sales</div>
                        <div className="text-2xl font-bold text-teal-300">{sales.length}</div>
                      </div>
                      <div className="bg-slate-800 bg-opacity-50 rounded p-4 border border-slate-600">
                        <div className="text-slate-400 text-sm">Total Revenue</div>
                        <div className="text-2xl font-bold text-cyan-300">${sales.reduce((sum, s) => sum + (parseFloat(s.sale_price) || 0), 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-800 bg-opacity-50 rounded p-4 border border-slate-600">
                        <div className="text-slate-400 text-sm">Total Profit</div>
                        <div className="text-2xl font-bold text-emerald-300">${sales.reduce((sum, s) => sum + ((parseFloat(s.sale_price) || 0) - calculateDeckCOGS(s.decklist_id)), 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">No sales recorded yet. Sell containers to see analytics here.</p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !isLoading && (
          <div className="space-y-6 text-white">
            <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-300" />
                Reorder Alerts
              </h2>
              <div className="grid gap-4 text-white">
                {getReorderAlerts().length > 0 ? (
                  getReorderAlerts().map((item) => (
                    <div key={item.id} className="bg-slate-800 border border-red-400 rounded p-4">
                      <div className="font-semibold text-red-300">{item.name}</div>
                      <div className="text-sm text-slate-300">Quantity: {item.quantity} (Type: {item.reorder_type})</div>
                      <div className="text-sm text-slate-300">Set: {item.set_name}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No items below reorder threshold.</p>
                )}
              </div>
            </div>

            <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
              <h2 className="text-xl font-bold mb-4">Inventory Statistics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-600 rounded p-4">
                  <div className="text-slate-400 text-sm">Total Cards</div>
                  <div className="text-2xl font-bold text-teal-300">{inventory.length}</div>
                </div>
                <div className="bg-slate-800 border border-slate-600 rounded p-4">
                  <div className="text-slate-400 text-sm">Total Quantity</div>
                  <div className="text-2xl font-bold text-teal-300">{inventory.reduce((sum, card) => sum + (card.quantity || 0), 0)}</div>
                </div>
                <div className="bg-slate-800 border border-slate-600 rounded p-4">
                  <div className="text-slate-400 text-sm">Total Value</div>
                  <div className="text-2xl font-bold text-teal-300">${inventory.reduce((sum, card) => sum + (parseFloat(card.purchase_price) || 0), 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="card p-6 border rounded-lg p-6 border border-slate-700 hover:border-teal-500">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="grid gap-2">
                {usageHistory.length > 0 ? (
                  usageHistory.map((entry, idx) => (
                    <div key={idx} className="bg-slate-800 border border-slate-600 rounded p-3 text-sm">
                      <span className="font-semibold text-teal-300">{entry.action}</span>
                      <span className="text-slate-400"> - {new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sell Modal */}
        {showSellModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 hover:border-teal-500 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Sell Container</h2>
                <button
                  onClick={() => {
                    setShowSellModal(false);
                    setSelectedContainerForSale(null);
                    setSalePrice('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {selectedContainerForSale && (
                <div className="mb-4">
                  <div className="bg-slate-800 border border-slate-600 rounded p-3 mb-4">
                    <div className="text-sm text-slate-400">Container</div>
                    <div className="font-semibold">{containers.find(c => c.id === selectedContainerForSale)?.name}</div>
                  </div>
                  
                  <div className="bg-slate-800 border border-slate-600 rounded p-3 mb-4">
                    <div className="text-sm text-slate-400">Estimated COGS</div>
                    <div className="font-semibold text-teal-300">
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
                    className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                  />
                </div>
                
                {salePrice && (
                  <div className="bg-emerald-900 bg-opacity-30 border border-green-500 rounded p-3">
                    <div className="text-sm text-slate-400">Estimated Profit</div>
                    <div className={`font-semibold text-lg ${(salePrice - calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id)) >= 0 ? 'text-emerald-400' : 'text-red-300'}`}>
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
            <div className="bg-slate-800 border border-slate-700 hover:border-teal-500 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Reorder Thresholds</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Normal Cards</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.normal}
                    onChange={(e) => setReorderSettings({...reorderSettings, normal: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Lands</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.land}
                    onChange={(e) => setReorderSettings({...reorderSettings, land: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bulk Items</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.bulk}
                    onChange={(e) => setReorderSettings({...reorderSettings, bulk: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                  />
                </div>
                <div className="border-t border-slate-700 hover:border-teal-500 pt-4 mt-4">
                  <button
                    onClick={() => {
                      setPriceCache({});
                      setSuccessMessage('Price cache cleared successfully!');
                      setTimeout(() => setSuccessMessage(''), 3000);
                    }}
                    className="w-full btn-accent mb-2"
                  >
                    Refresh Price Cache
                  </button>
                  <p className="text-xs text-slate-400">Clears cached card prices and fetches fresh data</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveReorderSettings}
                    className="flex-1 btn-primary hover:shadow-lg rounded px-4 py-2 font-semibold"
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
