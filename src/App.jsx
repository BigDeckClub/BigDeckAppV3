import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Package,
  Copy,
  Layers,
  AlertCircle,
  TrendingUp,
  Settings,
  RefreshCw,
  DollarSign,
  X,
  ChevronDown,
} from "lucide-react";
import { useDebounce } from "./utils/useDebounce";
import { InventoryTab } from "./components/InventoryTab";
import { PriceCacheProvider, usePriceCache } from "./context/PriceCacheContext";
import DecklistCardPrice from "./components/DecklistCardPrice";
import { normalizeCardName, normalizeSetCode } from "./lib/fetchCardPrices";
import { FloatingDollarSigns } from "./components/FloatingDollarSigns";
import ErrorBoundary from "./components/ErrorBoundary";

// Use relative path - Vite dev server will proxy to backend
const API_BASE = "/api";

function MTGInventoryTrackerContent() {
  console.log("[APP] Component mounted");
  const { getPrice } = usePriceCache();
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState([]);
  const [decklists, setDecklists] = useState([]);
  const [containers, setContainers] = useState([]);
  const [sales, setSales] = useState([]);
  const [reorderSettings, setReorderSettings] = useState({
    bulk: 12,
    land: 20,
    normal: 4,
  });
  const [usageHistory, setUsageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPurchased60Days, setTotalPurchased60Days] = useState(0);

  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedContainerForSale, setSelectedContainerForSale] =
    useState(null);
  const [salePrice, setSalePrice] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCardSets, setSelectedCardSets] = useState([]);

  const [newEntry, setNewEntry] = useState({
    quantity: 1,
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    reorderType: "normal",
    selectedSet: null,
  });

  const [decklistName, setDecklistName] = useState("");
  const [decklistPaste, setDecklistPaste] = useState("");
  const [showDecklistForm, setShowDecklistForm] = useState(false);
  const [deckPreview, setDeckPreview] = useState(null);
  const [deckPreviewLoading, setDeckPreviewLoading] = useState(false);

  const [containerName, setContainerName] = useState("");
  const [selectedDecklist, setSelectedDecklist] = useState(null);
  const [showContainerForm, setShowContainerForm] = useState(false);
  const [showSetSelector, setShowSetSelector] = useState(false);
  const [setSelectionData, setSetSelectionData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [expandedContainers, setExpandedContainers] = useState({});
  const [containerItems, setContainerItems] = useState({});
  const [defaultSearchSet, setDefaultSearchSet] = useState("");
  const [allSets, setAllSets] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [decklistPrices, setDecklistPrices] = useState({});
  const [containerPriceCache, setContainerPriceCache] = useState({});
  const [expandedDecklists, setExpandedDecklists] = useState({});
  const [editingDecklistCard, setEditingDecklistCard] = useState(null);
  const [editCardSet, setEditCardSet] = useState("");
  const [editCardAvailableSets, setEditCardAvailableSets] = useState([]);
  const [lastUsedSets, setLastUsedSets] = useState({});
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [expandedSoldContainers, setExpandedSoldContainers] = useState({});
  const [expandedCardCopies, setExpandedCardCopies] = useState({});
  const [showSaleAnimation, setShowSaleAnimation] = useState(false);

  const calculateDecklistPrices = async (decklist) => {
    try {
      const lines = decklist.split("\n");
      let tcgTotal = 0,
        ckTotal = 0;

      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
        if (!match) continue;

        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();
        const setFromDecklist = match[3];

        try {
          let tcgPrice = 0,
            ckPrice = 0;
          let setToUse = setFromDecklist;

          // If no set in decklist, try to find from inventory
          if (!setToUse) {
            const inventoryCard = inventory.find(
              (card) => card.name.toLowerCase() === cardName.toLowerCase(),
            );
            if (inventoryCard) {
              setToUse = inventoryCard.set;
            }
          }

          if (setToUse) {
            // Use unified pricing via PriceCacheContext
            const normalizedName = normalizeCardName(cardName);
            const normalizedSet = normalizeSetCode(setToUse);
            const priceData = await getPrice(normalizedName, normalizedSet);
            
            if (priceData && priceData.tcg !== "N/A") {
              tcgPrice = parseFloat(String(priceData.tcg).replace("$", "")) || 0;
              ckPrice = parseFloat(String(priceData.ck).replace("$", "")) || 0;
              
              // If CK price is N/A or 0, use fallback
              if (ckPrice === 0 && tcgPrice > 0) {
                ckPrice = tcgPrice * 1.15;
              }
            }
          } else {
            // Card not in inventory - find set from Scryfall and use unified pricing
            try {
              const scryfallUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints&order=released`;
              const scryfallResponse = await fetch(scryfallUrl);
              if (scryfallResponse.ok) {
                const scryfallData = await scryfallResponse.json();
                if (scryfallData.data && scryfallData.data.length > 0) {
                  let foundPrice = false;

                  for (const card of scryfallData.data.slice(0, 10)) {
                    // Get TCG price from Scryfall
                    const currentTcgPrice = parseFloat(card.prices?.usd) || 0;
                    if (currentTcgPrice > 0) {
                      tcgPrice = currentTcgPrice;
                    }

                    if (card.set) {
                      // Use unified pricing via PriceCacheContext
                      try {
                        const normalizedName = normalizeCardName(cardName);
                        const normalizedSet = normalizeSetCode(card.set);
                        const priceData = await getPrice(normalizedName, normalizedSet);
                        
                        if (priceData && priceData.ck && priceData.ck !== "N/A") {
                          ckPrice = parseFloat(String(priceData.ck).replace("$", "")) || 0;
                          if (ckPrice > 0) {
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
            } catch (err) {}
          }

          tcgTotal += tcgPrice * quantity;
          ckTotal += ckPrice * quantity;
        } catch (err) {}
      }

      return { tcg: tcgTotal, ck: ckTotal };
    } catch (err) {
      return { tcg: 0, ck: 0 };
    }
  };

  const calculateContainerMarketPrices = async (containerId) => {
    const items = containerItems[containerId] || [];
    // Defensive guard: ensure items is an array
    if (!Array.isArray(items)) {
      return { tcg: 0, ck: 0 };
    }
    
    let tcgTotal = 0,
      ckTotal = 0;

    for (const item of items) {
      try {
        // Use unified pricing via PriceCacheContext
        const normalizedName = normalizeCardName(item.name);
        const normalizedSet = normalizeSetCode(item.set);
        // DEBUG: // DEBUG: console.log(`[CONTAINER] requesting ${normalizedName}|${normalizedSet}`);
        const priceData = await getPrice(normalizedName, normalizedSet);
        // DEBUG: // DEBUG: console.log(`[CONTAINER] resolved ${normalizedName}|${normalizedSet}:`, priceData);
        
        if (priceData && priceData.tcg !== "N/A") {
          const tcgPrice = parseFloat(String(priceData.tcg).replace("$", "")) || 0;
          let ckPrice = parseFloat(String(priceData.ck).replace("$", "")) || 0;

          // If CK price is N/A or 0, use fallback
          if (ckPrice === 0 && tcgPrice > 0) {
            ckPrice = tcgPrice * 1.15;
          }

          const quantity = parseInt(item.quantity_used) || 0;
          tcgTotal += tcgPrice * quantity;
          ckTotal += ckPrice * quantity;
        }
      } catch (err) {
        // DEBUG: // DEBUG: console.error(`[CONTAINER] getPrice error for ${item.name}|${item.set}:`, err);
      }
    }

    return { tcg: tcgTotal, ck: ckTotal };
  };

  useEffect(() => {
    loadAllData();
    loadAllSets();
    loadUsageHistory();
    const saved = localStorage.getItem("defaultSearchSet");
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
        prices[containerId] = await calculateContainerMarketPrices(
          parseInt(containerId),
        );
      }
      setContainerPriceCache(prices);
    };
    if (Object.keys(containerItems).length > 0) {
      calculateAllContainerPrices();
    }
  }, [containerItems]);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadUsageHistory();
      const fetchTotalPurchases = async () => {
        try {
          const response = await fetch(`${API_BASE}/analytics/total-purchases-60days`);
          const data = await response.json();
          setTotalPurchased60Days(data.totalSpent || 0);
        } catch (err) {
          console.error('Failed to fetch total purchases:', err);
          setTotalPurchased60Days(0);
        }
      };
      fetchTotalPurchases();
    }
  }, [activeTab]);

  const loadAllSets = async () => {
    try {
      const response = await fetch("https://api.scryfall.com/sets");
      if (response.ok) {
        const data = await response.json();
        const sets = data.data
          .map((set) => ({
            code: set.code.toUpperCase(),
            name: set.name,
          }))
          .sort((a, b) => a.code.localeCompare(b.code));
        setAllSets(sets);
      }
    } catch (error) {}
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.allSettled([
        loadInventory(),
        loadDecklists(),
        loadContainers(),
        loadSales(),
        loadReorderSettings(),
        loadUsageHistory(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
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
    } catch (error) {}
  };

  const addInventoryItem = async (item) => {
    console.log('[FRONTEND] addInventoryItem called with:', JSON.stringify(item, null, 2));
    try {
      const response = await fetch(`${API_BASE}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      console.log('[FRONTEND] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FRONTEND] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[FRONTEND] Success response:', result);
      
      await loadInventory();
      setSuccessMessage("Card added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      console.error('[FRONTEND] addInventoryItem error:', error);
      setSuccessMessage("Error adding card: " + error.message);
      setTimeout(() => setSuccessMessage(""), 3000);
      return false;
    }
  };

  const startEditingItem = (item) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity,
      purchase_price: item.purchase_price || "",
      purchase_date: item.purchase_date || "",
      reorder_type: item.reorder_type || "normal",
    });
  };

  const updateInventoryItem = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parseInt(editForm.quantity),
          purchase_price: editForm.purchase_price
            ? parseFloat(editForm.purchase_price)
            : null,
          purchase_date: editForm.purchase_date,
          reorder_type: editForm.reorder_type,
        }),
      });
      if (!response.ok) throw new Error("Failed to update card");
      await loadInventory();
      setEditingId(null);
      alert("Card updated successfully!");
    } catch (error) {
      alert("Error updating card: " + error.message);
    }
  };

  const deleteInventoryItem = async (id) => {
    console.log('[DELETE] Attempting to delete inventory item:', id);
    if (!id) {
      console.error('[DELETE] No ID provided');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this card?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/inventory/${id}`, { method: "DELETE" });
      console.log('[DELETE] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }
      await loadInventory();
      setSuccessMessage("Card deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('[DELETE] Error:', error);
      setSuccessMessage("Error deleting card: " + error.message);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };


  const searchScryfall = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`,
      );
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const cards = data.data.map((card) => ({
        id: card.id,
        name: card.name,
        set: card.set.toUpperCase(),
        setName: card.set_name,
        type: card.type_line,
        imageUrl: card.image_uris?.normal || null,
      }));

      const prioritized = [];
      const seen = new Set();

      const inventoryByName = {};
      inventory.forEach((item) => {
        if (!inventoryByName[item.name]) {
          inventoryByName[item.name] = [];
        }
        inventoryByName[item.name].push({
          set: item.set,
          setName: item.set_name,
          purchaseDate: item.purchase_date,
        });
      });

      Object.keys(inventoryByName).forEach((cardName) => {
        inventoryByName[cardName].sort(
          (a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate),
        );
      });

      // First, if default set is selected, show matches from that set
      if (defaultSearchSet) {
        cards.forEach((card) => {
          if (
            !seen.has(`${card.name}|${card.set}`) &&
            card.set === defaultSearchSet
          ) {
            prioritized.push(card);
            seen.add(`${card.name}|${card.set}`);
          }
        });
      }

      // Then add prioritized inventory cards (most recent 2 sets)
      cards.forEach((card) => {
        if (
          !seen.has(`${card.name}|${card.set}`) &&
          inventoryByName[card.name]
        ) {
          const inventoryVariants = inventoryByName[card.name].slice(0, 2);
          if (inventoryVariants.some((v) => v.set === card.set)) {
            prioritized.push(card);
            seen.add(`${card.name}|${card.set}`);
          }
        }
      });

      // Then add remaining cards
      cards.forEach((card) => {
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
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=!"${card.name}"&unique=prints&order=released`,
      );
      if (response.ok) {
        const data = await response.json();
        const allVersions = data.data.map((c) => ({
          id: c.id,
          name: c.name,
          set: c.set.toUpperCase(),
          setName: c.set_name,
          type: c.type_line,
          imageUrl: c.image_uris?.normal || null,
        }));

        setSelectedCardSets(allVersions);
      } else {
        // Fallback to search results if API call fails
        const cardVersions = searchResults.filter((c) => c.name === card.name);
        setSelectedCardSets(cardVersions.length > 0 ? cardVersions : [card]);
      }
    } catch (error) {
      const cardVersions = searchResults.filter((c) => c.name === card.name);
      setSelectedCardSets(cardVersions.length > 0 ? cardVersions : [card]);
    }

    setNewEntry({
      ...newEntry,
      selectedSet: {
        id: card.id,
        name: card.name,
        set: card.set,
        setName: card.setName,
        imageUrl: card.imageUrl,
      },
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const addCard = async () => {
    if (!newEntry.selectedSet) {
      alert("Please select a card");
      return;
    }

    const item = {
      name: newEntry.selectedSet.name,
      set: newEntry.selectedSet.set,
      set_name: newEntry.selectedSet.setName,
      quantity: newEntry.quantity,
      purchase_date: newEntry.purchaseDate,
      purchase_price: newEntry.purchasePrice
        ? parseFloat(newEntry.purchasePrice)
        : null,
      reorder_type: newEntry.reorderType,
      image_url: newEntry.selectedSet.imageUrl,
    };

    if (await addInventoryItem(item)) {
      setNewEntry({
        quantity: 1,
        purchaseDate: new Date().toISOString().split("T")[0],
        purchasePrice: "",
        reorderType: "normal",
        selectedSet: null,
      });
    }
  };

  const loadDecklists = async () => {
    try {
      const response = await fetch(`${API_BASE}/decklists`);
      const data = await response.json();
      setDecklists(data || []);
    } catch (error) {}
  };

  const parseAndPreviewDecklist = async () => {
    if (!decklistName || !decklistPaste) {
      alert("Please fill in all fields");
      return;
    }

    setDeckPreviewLoading(true);
    try {
      const lines = decklistPaste.split("\n").filter((line) => line.trim());
      const cardsToFind = [];

      // Parse decklist lines (format: "3 Card Name")
      lines.forEach((line) => {
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
      const previewCards = await Promise.all(
        cardsToFind.map(async (card) => {
          try {
            const query = `!"${card.name}"`;
            const scryfallRes = await fetch(
              `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`,
            );

            if (!scryfallRes.ok) {
              return {
                cardName: card.name,
                quantity: card.quantity,
                found: false,
                error: `Card not found`,
              };
            }

            const scryfallData = await scryfallRes.json();
            const cards = scryfallData.data || [];

            return {
              cardName: card.name,
              quantity: card.quantity,
              found: cards.length > 0,
              sets: cards.map((c) => ({
                set: c.set.toUpperCase(),
                setName: c.set_name,
                rarity: c.rarity,
                price: c.prices?.usd || "N/A",
              })),
            };
          } catch (err) {
            return {
              cardName: card.name,
              quantity: card.quantity,
              found: false,
              error: err.message,
            };
          }
        }),
      );

      setDeckPreview(previewCards);
    } catch (error) {
      alert("Error parsing decklist: " + error.message);
    } finally {
      setDeckPreviewLoading(false);
    }
  };

  const validateDecklistCards = (preview) => {
    const missingCards = [];

    preview.forEach((card) => {
      if (!card.found) {
        missingCards.push(card.cardName);
      }
    });

    if (missingCards.length > 0) {
      alert(
        `These cards were not found in Scryfall:\n${missingCards.join("\n")}`,
      );
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: decklistName, decklist: decklistPaste }),
      });
      if (!response.ok) throw new Error("Failed to add decklist");
      setDecklistName("");
      setDecklistPaste("");
      setShowDecklistForm(false);
      setDeckPreview(null);
      await loadDecklists();
    } catch (error) {
      alert("Error adding decklist: " + error.message);
    }
  };

  const deleteDecklist = async (id) => {
    try {
      await fetch(`${API_BASE}/decklists/${id}`, { method: "DELETE" });
      await loadDecklists();
    } catch (error) {}
  };

  const loadContainers = async () => {
    try {
      const response = await fetch(`${API_BASE}/containers`);
      const data = await response.json();
      setContainers(data || []);

      // Extract cards from container response
      if (data && data.length > 0) {
        const itemsMap = {};
        data.forEach(container => {
          console.log(`[CONTAINER] ID: ${container.id}, Cards:`, container.cards);
          itemsMap[container.id] = container.cards || [];
        });
        console.log('[CONTAINER] Final itemsMap:', itemsMap);
        setContainerItems(itemsMap);
      }
    } catch (error) {
      console.error('Load containers error:', error);
    }
  };

  const toggleContainerExpand = (containerId) => {
    setExpandedContainers((prev) => ({
      ...prev,
      [containerId]: !prev[containerId],
    }));
  };

  const addContainer = async () => {
    if (!containerName || !selectedDecklist) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/containers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: containerName,
          decklist_id: parseInt(selectedDecklist),
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to add container:", response.status, error);
        alert("Error creating container: " + error);
        return;
      }
      setContainerName("");
      setSelectedDecklist(null);
      setShowContainerForm(false);
      await Promise.all([loadContainers(), loadInventory()]);
      setSuccessMessage("Container created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Container creation error:", error);
      alert("Error: " + error.message);
    }
  };

  const deleteContainer = async (id) => {
    try {
      await fetch(`${API_BASE}/containers/${id}`, { method: "DELETE" });
      await loadContainers();
    } catch (error) {}
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
    const deck = decklists.find((d) => d.id === decklistId);
    if (!deck || !deck.decklist) return 0;

    let totalCost = 0;
    const lines = deck.decklist.split("\n");

    lines.forEach((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();

        // Find matching card in inventory
        const inventoryCard = inventory.find(
          (card) => card.name.toLowerCase() === cardName.toLowerCase(),
        );

        if (inventoryCard && inventoryCard.purchase_price) {
          totalCost +=
            quantity * (parseFloat(inventoryCard.purchase_price) || 0);
        }
      }
    });

    return totalCost;
  };

  const calculateContainerTotalCost = (containerId) => {
    const items = containerItems[containerId] || [];
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity_used) || 0;
      const price = parseFloat(item.purchase_price) || 0;
      return total + (quantity * price);
    }, 0);
  };

  const sellContainer = async () => {
    const priceToParse = parseFloat(salePrice);
    if (!selectedContainerForSale || !priceToParse || isNaN(priceToParse)) {
      setSuccessMessage("Error: Please enter a valid sale price");
      return;
    }

    try {
      const containerName = containers.find(c => c.id === selectedContainerForSale)?.name || 'Unknown';
      const response = await fetch(`${API_BASE}/containers/${selectedContainerForSale}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salePrice: priceToParse,
        }),
      });

      if (!response.ok) throw new Error("Failed to record sale");

      await Promise.all([loadSales(), loadContainers(), loadInventory()]);
      
      // Log the sale activity
      const cogs = calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id);
      const profit = priceToParse - cogs;
      await recordUsage(
        `Sold container: ${containerName} for $${priceToParse}`,
        { container_id: selectedContainerForSale, container_name: containerName, sale_price: priceToParse, cogs, profit }
      );

      setShowSellModal(false);
      setSelectedContainerForSale(null);
      setSalePrice("");
      setSuccessMessage("Container sold! Sale recorded.");
      setShowSaleAnimation(true);
      setTimeout(() => {
        setSuccessMessage("");
        setShowSaleAnimation(false);
      }, 3000);
    } catch (error) {
      setSuccessMessage("Error recording sale: " + error.message);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const loadReorderSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/reorder_thresholds`);
      const data = await response.json();
      if (data) {
        setReorderSettings(data);
      }
    } catch (error) {}
  };

  const saveReorderSettings = async () => {
    try {
      await fetch(`${API_BASE}/settings/reorder_thresholds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: reorderSettings }),
      });
      setShowSettings(false);
    } catch (error) {}
  };

  const loadUsageHistory = async () => {
    try {
      console.log('[ACTIVITY] Fetching recent activity...');
      const response = await fetch(`${API_BASE}/usage-history?limit=50`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const history = await response.json();
      console.log(`[ACTIVITY] ✅ Loaded ${history.length} activity records`);
      setUsageHistory(history);
    } catch (error) {
      console.error('[ACTIVITY] ❌ Failed to load history:', error.message);
      setUsageHistory([]);
    }
  };

  const recordUsage = async (action, details) => {
    try {
      console.log(`[ACTIVITY] Recording: ${action}`);
      const response = await fetch(`${API_BASE}/usage-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(`[ACTIVITY] ✅ Activity recorded`);
      
      // Reload activity list
      await loadUsageHistory();
    } catch (error) {
      console.error('[ACTIVITY] ❌ Failed to record activity:', error.message);
    }
  };

  const getReorderAlerts = () => {
    // Group items by name and set combination from inventory only
    const grouped = {};
    inventory.forEach((item) => {
      const key = `${item.name}|${item.set}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: item.name,
          reorder_type: item.reorder_type,
          set_code: item.set,
          set_name: item.set_name,
          quantity: 0,
          purchase_price: item.purchase_price,
          id: item.id,
          groupName: item.name,
        };
      }
      grouped[key].quantity += parseInt(item.quantity) || 0;
    });

    // Calculate container usage (active containers only) for each card+set combo
    const withUsage = Object.values(grouped).map((item) => {
      const cardsInContainers =
        (containerItems &&
          Object.values(containerItems)
            .flat()
            .filter((ci) => ci.name === item.name && ci.set === item.set_code)
            .reduce((sum, ci) => sum + (ci.quantity_used || 0), 0)) ||
        0;

      return { ...item, cardsInContainers };
    });

    // Filter to only items below threshold
    return withUsage.filter((item) => {
      const threshold = reorderSettings[item.reorder_type] || 5;
      return item.quantity <= threshold;
    });
  };

  const calculateContainerPrices = (containerId) => {
    return containerPriceCache[containerId] || { tcg: 0, ck: 0 };
  };

  const navItems = [
    { id: "inventory", icon: Layers, label: "Inventory" },
    { id: "decklists", icon: FileText, label: "Decks" },
    { id: "containers", icon: Package, label: "Boxes" },
    { id: "analytics", icon: TrendingUp, label: "Stats" },
    { id: "sales", icon: DollarSign, label: "Sales" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <FloatingDollarSigns 
        show={showSaleAnimation} 
        onAnimationEnd={() => setShowSaleAnimation(false)}
      />
      {/* Desktop Navigation */}
      <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-xl shadow-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 app-header flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-300">BigDeck.app</h1>
          <div className="desktop-nav flex gap-2">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "inventory" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <Layers className="w-5 h-5 inline mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab("decklists")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "decklists" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Decklists
            </button>
            <button
              onClick={() => setActiveTab("containers")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "containers" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Containers
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "analytics" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "sales" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Sales
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 hover:shadow-lg transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`mobile-nav-item ${activeTab === item.id ? "active" : "inactive"}`}
              >
                <Icon className="w-5 h-5 mobile-nav-icon" />
                <span className="mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`mobile-nav-item ${showSettings ? "active" : "inactive"}`}
          >
            <Settings className="w-5 h-5 mobile-nav-icon" />
            <span className="mobile-nav-label">Settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 main-content md:px-4 px-3">
        {isLoading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400" />
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && !isLoading && (
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
            MarketPrices={DecklistCardPrice}
            handleSearch={handleSearch}
          />
        )}

        {/* OLD INVENTORY CODE - REPLACED BY COMPONENT */}

        {/* Decklists Tab */}
        {activeTab === "decklists" && !isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {!showDecklistForm ? (
              <button
                onClick={() => setShowDecklistForm(true)}
                className="btn-primary w-full sm:w-auto px-4 sm:px-6 py-3 font-semibold"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Decklist
              </button>
            ) : (
              <div className="card p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Create Decklist</h2>
                <input
                  type="text"
                  placeholder="Decklist Name"
                  value={decklistName}
                  onChange={(e) => setDecklistName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4"
                />
                <textarea
                  placeholder="Paste decklist here (e.g., '2 Lightning Bolt')"
                  value={decklistPaste}
                  onChange={(e) => setDecklistPaste(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4 h-48"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={parseAndPreviewDecklist}
                    disabled={deckPreviewLoading}
                    className="flex-1 btn-primary disabled:opacity-50 px-4 py-3 font-semibold"
                  >
                    {deckPreviewLoading ? "Checking..." : "Check Inventory"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDecklistForm(false);
                      setDeckPreview(null);
                    }}
                    className="flex-1 btn-secondary px-4 py-3 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {deckPreview && (
                  <div className="mt-6 border-t border-slate-700 hover:border-teal-500 pt-4">
                    <h3 className="font-semibold mb-3">Decklist Preview</h3>
                    <div className="bg-slate-800 p-4 max-h-96 overflow-y-auto space-y-2">
                      {deckPreview.map((card, idx) => (
                        <div
                          key={idx}
                          className={`p-2 border-l-4 flex justify-between items-center ${card.found ? "border-green-500 bg-emerald-900 bg-opacity-20" : "border-red-600 bg-red-950 bg-opacity-20"}`}
                        >
                          <span className="text-sm font-semibold">
                            {card.quantity}x {card.cardName}
                          </span>
                          <span className="text-xs">
                            {card.found
                              ? "✓ Found"
                              : card.error || "✗ Not found"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={confirmAndAddDecklist}
                      className="w-full mt-4 btn-primary px-4 py-2 font-semibold"
                    >
                      Confirm & Create Decklist
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
                Decklists ({decklists.length})
              </h2>
              <div className="grid gap-3 sm:gap-4">
                {decklists.map((deck) => {
                  const prices = decklistPrices[deck.id] || { tcg: 0, ck: 0 };
                  const isExpanded = expandedDecklists[deck.id];
                  const decklistText = deck.decklist || "";
                  const deckCards = decklistText
                    .split("\n")
                    .filter((line) => line.trim())
                    .flatMap((line) => {
                      const match = line.match(
                        /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/,
                      );
                      if (!match) return [];
                      const quantity = parseInt(match[1]);
                      const name = match[2].trim();
                      const setCode = match[3] || null;
                      return Array.from({ length: quantity }, () => ({
                        name,
                        setCode,
                      }));
                    })
                    .filter(Boolean);

                  return (
                    <div
                      key={deck.id}
                      className="bg-slate-800 border border-slate-600 p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{deck.name}</div>
                          <div className="text-sm text-slate-300 mt-2">
                            {deckCards.length} cards
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4 justify-end">
                          <button
                            onClick={() =>
                              setExpandedDecklists((prev) => ({
                                ...prev,
                                [deck.id]: !prev[deck.id],
                              }))
                            }
                            className="btn-primary px-4 py-2 font-semibold"
                          >
                            {isExpanded ? "Hide" : "View"} Cards
                          </button>
                          <button
                            onClick={() => deleteDecklist(deck.id)}
                            className="btn-danger px-3 py-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-700 hover:border-teal-500 pt-2 mt-2">
                        <div className="text-teal-300">
                          TCG: ${prices.tcg.toFixed(2)}
                        </div>
                        <div className="text-cyan-300">
                          CK: ${prices.ck.toFixed(2)}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-700 hover:border-teal-500">
                          <h4 className="font-semibold mb-3">Cards in Decklist</h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {(() => {
                              // Group cards by name
                              const groupedByName = {};
                              deckCards.forEach((card, idx) => {
                                let cardSet = card.setCode;
                                if (!cardSet) {
                                  const inventoryCard = inventory.find(
                                    (inv) =>
                                      inv.name.toLowerCase() ===
                                      card.name.toLowerCase(),
                                  );
                                  cardSet =
                                    inventoryCard?.set ||
                                    defaultSearchSet ||
                                    "UNK";
                                }
                                const cardKey = `${card.name}|${cardSet}`;
                                if (!groupedByName[cardKey]) {
                                  groupedByName[cardKey] = {
                                    name: card.name,
                                    set: cardSet,
                                    copies: [],
                                  };
                                }
                                groupedByName[cardKey].copies.push({ idx, card });
                              });

                              return Object.entries(groupedByName).map(([cardKey, group]) => {
                                const isGroupExpanded = expandedCardCopies[`${deck.id}-group-${cardKey}`];
                                
                                return (
                                  <div key={cardKey} className="bg-slate-800 border border-slate-600 rounded">
                                    <button
                                      onClick={() => setExpandedCardCopies(prev => ({
                                        ...prev,
                                        [`${deck.id}-group-${cardKey}`]: !isGroupExpanded
                                      }))}
                                      className="w-full p-3 text-sm flex justify-between items-center hover:bg-slate-700 transition"
                                    >
                                      <div className="text-left flex-1">
                                        <div className="font-semibold">{group.name}</div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right text-xs">
                                          <div className="text-teal-300 font-semibold">{group.copies.length}x</div>
                                        </div>
                                        <div className="text-slate-400">
                                          {isGroupExpanded ? '▼' : '▶'}
                                        </div>
                                      </div>
                                    </button>

                                    {isGroupExpanded && (
                                      <div className="bg-slate-900 bg-opacity-50 border-t border-slate-600 p-3 space-y-2">
                                        {group.copies.map(({ idx, card }, copyIdx) => {
                                          const isEditingThisCard =
                                            editingDecklistCard?.idx === idx &&
                                            editingDecklistCard?.deckId === deck.id;

                                          return (
                                            <div key={copyIdx} className="bg-slate-800 p-3 rounded border border-slate-600 text-xs space-y-2">
                                              <div className="font-semibold text-slate-200">{group.set}</div>
                                              {isEditingThisCard ? (
                                                <div className="space-y-2">
                                                  <select
                                                    value={editCardSet}
                                                    onChange={(e) =>
                                                      setEditCardSet(e.target.value)
                                                    }
                                                    className="w-full bg-slate-700 border border-slate-600 px-3 py-2 text-white text-xs"
                                                  >
                                                    <option value="">
                                                      Select a set...
                                                    </option>
                                                    {editCardAvailableSets.map((set) => (
                                                      <option
                                                        key={set.code}
                                                        value={set.code}
                                                      >
                                                        {set.code.toUpperCase()} -{" "}
                                                        {set.name}
                                                      </option>
                                                    ))}
                                                  </select>
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => {
                                                        if (!editCardSet) {
                                                          alert("Please select a set");
                                                          return;
                                                        }

                                                        const lines = (deck.decklist || "")
                                                          .split("\n")
                                                          .filter((line) => line.trim());

                                                        let found = false;
                                                        let cardInstanceCount = 0;
                                                        const newLines = lines.map(
                                                          (line) => {
                                                            const match = line.match(
                                                              /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/,
                                                            );
                                                            if (match) {
                                                              const qty = match[1];
                                                              const cardNamePart =
                                                                match[2].trim();

                                                              if (
                                                                cardNamePart.toLowerCase() ===
                                                                card.name.toLowerCase()
                                                              ) {
                                                                if (
                                                                  cardInstanceCount +
                                                                    parseInt(qty) >
                                                                    idx &&
                                                                  cardInstanceCount <= idx
                                                                ) {
                                                                  found = true;
                                                                  return `${qty} ${cardNamePart} (${editCardSet.toUpperCase()})`;
                                                                }
                                                                cardInstanceCount +=
                                                                  parseInt(qty);
                                                              }
                                                            }
                                                            return line;
                                                          },
                                                        );

                                                        if (found) {
                                                          const newDecklistText =
                                                            newLines.join("\n");

                                                          fetch(
                                                            `${API_BASE}/decklists/${deck.id}`,
                                                            {
                                                              method: "PUT",
                                                              headers: {
                                                                "Content-Type":
                                                                  "application/json",
                                                              },
                                                              body: JSON.stringify({
                                                                decklist: newDecklistText,
                                                              }),
                                                            },
                                                          )
                                                            .then(() => {
                                                              setLastUsedSets((prev) => ({
                                                                ...prev,
                                                                [card.name.toLowerCase()]:
                                                                  editCardSet,
                                                              }));
                                                              loadDecklists();
                                                              setEditingDecklistCard(null);
                                                            })
                                                            .catch(() => {
                                                              alert(
                                                                "Failed to update decklist",
                                                              );
                                                            });
                                                        } else {
                                                          alert(
                                                            "Could not find card in decklist",
                                                          );
                                                        }
                                                      }}
                                                      className="flex-1 btn-primary px-2 py-1 text-xs font-semibold"
                                                    >
                                                      Save
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        setEditingDecklistCard(null)
                                                      }
                                                      className="flex-1 btn-secondary px-2 py-1 text-xs font-semibold"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <>
                                                  <div className="grid grid-cols-4 gap-2">
                                                    <div className="bg-slate-700 p-2 rounded">
                                                      <div className="text-slate-400 text-xs mb-1">TCG Player</div>
                                                      <DecklistCardPrice key={`price-${group.name}-${group.set}-tcg-${copyIdx}`} name={group.name} set={group.set} priceType="tcg" />
                                                    </div>
                                                    <div className="bg-slate-700 p-2 rounded">
                                                      <div className="text-slate-400 text-xs mb-1">Card Kingdom</div>
                                                      <DecklistCardPrice key={`price-${group.name}-${group.set}-ck-${copyIdx}`} name={group.name} set={group.set} priceType="ck" />
                                                    </div>
                                                    <button
                                                      onClick={() => {
                                                        const lines = (deck.decklist || "")
                                                          .split("\n")
                                                          .filter((line) => line.trim());
                                                        let cardInstanceCount = 0;
                                                        const newLines = lines.filter((line) => {
                                                          const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                                                          if (!match) return true;
                                                          const qty = parseInt(match[1]);
                                                          const cardNamePart = match[2].trim();
                                                          if (cardNamePart.toLowerCase() === card.name.toLowerCase()) {
                                                            if (cardInstanceCount + qty > idx && cardInstanceCount <= idx) {
                                                              if (qty === 1) return false;
                                                              return true;
                                                            }
                                                            cardInstanceCount += qty;
                                                          }
                                                          return true;
                                                        }).map((line) => {
                                                          const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                                                          if (!match) return line;
                                                          const qty = parseInt(match[1]);
                                                          const cardNamePart = match[2].trim();
                                                          const set = match[3];
                                                          if (cardNamePart.toLowerCase() === card.name.toLowerCase()) {
                                                            if (idx < cardInstanceCount) return line;
                                                            if (qty > 1) {
                                                              return `${qty - 1} ${cardNamePart}${set ? ` (${set})` : ""}`;
                                                            }
                                                            return null;
                                                          }
                                                          return line;
                                                        }).filter(Boolean);
                                                        const newDecklistText = newLines.join("\n");
                                                        fetch(`${API_BASE}/decklists/${deck.id}`, {
                                                          method: "PUT",
                                                          headers: { "Content-Type": "application/json" },
                                                          body: JSON.stringify({ decklist: newDecklistText }),
                                                        }).then(() => loadDecklists()).catch(() => alert("Failed to remove card"));
                                                      }}
                                                      className="btn-danger px-2 py-1 text-xs font-semibold h-fit"
                                                    >
                                                      Remove
                                                    </button>
                                                    <button
                                                      onClick={async () => {
                                                        const lastSet =
                                                          lastUsedSets[
                                                            card.name.toLowerCase()
                                                          ];
                                                        setEditingDecklistCard({
                                                          idx,
                                                          deckId: deck.id,
                                                        });
                                                        setEditCardSet(lastSet || group.set);

                                                        try {
                                                          const response = await fetch(
                                                            `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(card.name)}"&unique=prints&order=released`,
                                                          );
                                                          if (response.ok) {
                                                            const data =
                                                              await response.json();
                                                            const sets =
                                                              data.data?.map((c) => ({
                                                                code: c.set.toUpperCase(),
                                                                name: c.set_name,
                                                              })) || [];
                                                            const uniqueSets = Array.from(
                                                              new Map(
                                                                sets.map((s) => [
                                                                  s.code,
                                                                  s,
                                                                ]),
                                                              ).values(),
                                                            );
                                                            if (lastSet) {
                                                              uniqueSets.sort((a, b) => {
                                                                if (a.code === lastSet)
                                                                  return -1;
                                                                if (b.code === lastSet)
                                                                  return 1;
                                                                return 0;
                                                              });
                                                            }
                                                            setEditCardAvailableSets(
                                                              uniqueSets,
                                                            );
                                                          }
                                                        } catch (error) {
                                                          setEditCardAvailableSets([]);
                                                        }
                                                      }}
                                                      className="btn-primary px-2 py-1 text-xs font-semibold h-fit"
                                                    >
                                                      Edit Set
                                                    </button>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {decklists.length === 0 && (
                <p className="text-slate-400">No decklists yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Containers Tab */}
        {activeTab === "containers" && !isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {!showContainerForm ? (
              <button
                onClick={() => setShowContainerForm(true)}
                className="btn-primary w-full sm:w-auto px-4 sm:px-6 py-3 font-semibold"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Container
              </button>
            ) : (
              <div className="card p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Create Container</h2>
                <input
                  type="text"
                  placeholder="Container Name"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4"
                />
                <select
                  value={selectedDecklist || ""}
                  onChange={(e) => setSelectedDecklist(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4"
                >
                  <option value="">Select a Decklist</option>
                  {decklists.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={addContainer}
                    className="flex-1 btn-primary px-4 py-3 font-semibold"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowContainerForm(false)}
                    className="flex-1 btn-secondary px-4 py-3 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
                Containers ({containers.length})
              </h2>
              <div className="space-y-3">
                {containers.map((container) => {
                  const containerPrices = calculateContainerPrices(
                    container.id,
                  );
                  const totalCost = calculateContainerTotalCost(container.id);
                  return (
                    <div
                      key={container.id}
                      className="bg-slate-800 border border-slate-600 p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{container.name}</div>
                          <div className="text-sm text-slate-300">
                            Decklist ID: {container.decklist_id}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-2 text-slate-400">
                            <div className="text-orange-300 bg-slate-800 bg-opacity-50 p-2 rounded">
                              <div className="text-xs">Purchase Cost</div>
                              <div className="font-semibold">${totalCost.toFixed(2)}</div>
                            </div>
                            <div className="text-teal-300 bg-slate-800 bg-opacity-50 p-2 rounded">
                              <div className="text-xs">TCG Value</div>
                              <div className="font-semibold">${containerPrices.tcg.toFixed(2)}</div>
                            </div>
                            <div className="text-cyan-300 bg-slate-800 bg-opacity-50 p-2 rounded">
                              <div className="text-xs">CK Value</div>
                              <div className="font-semibold">${containerPrices.ck.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleContainerExpand(container.id)}
                            className="btn-primary px-4 py-2 font-semibold"
                          >
                            {expandedContainers[container.id] ? "Hide" : "View"}{" "}
                            Contents
                          </button>
                          <button
                            onClick={() => {
                              setSelectedContainerForSale(container.id);
                              setShowSellModal(true);
                            }}
                            className="btn-primary px-4 py-2 font-semibold flex items-center gap-2"
                          >
                            <DollarSign className="w-5 h-5" />
                            Sell
                          </button>
                          <button
                            onClick={() => deleteContainer(container.id)}
                            className="btn-danger px-3 py-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {expandedContainers[container.id] && (
                        <div className="mt-4 pt-4 border-t border-slate-700 hover:border-teal-500">
                          <h4 className="font-semibold mb-3">
                            Cards in Container
                          </h4>
                          {containerItems[container.id] !== undefined ? (
                            containerItems[container.id].length > 0 ? (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {(() => {
                                  // Expand each item by its quantity_used to show individual cards
                                  const expandedItems = [];
                                  containerItems[container.id].forEach((item, itemIdx) => {
                                    const quantity = parseInt(item.quantity_used) || 1;
                                    for (let i = 0; i < quantity; i++) {
                                      expandedItems.push({ ...item, copyNumber: i + 1, originalIdx: itemIdx, uniqueKey: `${itemIdx}-${i}` });
                                    }
                                  });
                                  
                                  // Group by card name
                                  const groupedByName = {};
                                  expandedItems.forEach(item => {
                                    if (!groupedByName[item.name]) {
                                      groupedByName[item.name] = [];
                                    }
                                    groupedByName[item.name].push(item);
                                  });
                                  
                                  return Object.entries(groupedByName).map(([cardName, cards]) => {
                                    const isGroupExpanded = expandedCardCopies[`${container.id}-group-${cardName}`];
                                    const firstCard = cards[0];
                                    
                                    return (
                                      <div key={cardName} className="bg-slate-800 border border-slate-600 rounded">
                                        <button
                                          onClick={() => setExpandedCardCopies(prev => ({
                                            ...prev,
                                            [`${container.id}-group-${cardName}`]: !isGroupExpanded
                                          }))}
                                          className="w-full p-3 text-sm flex justify-between items-center hover:bg-slate-700 transition"
                                        >
                                          <div className="text-left flex-1">
                                            <div className="font-semibold">{cardName}</div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-right text-xs">
                                              <div className="text-teal-300 font-semibold">{cards.length}x</div>
                                            </div>
                                            <div className="text-slate-400">
                                              {isGroupExpanded ? '▼' : '▶'}
                                            </div>
                                          </div>
                                        </button>
                                        
                                        {isGroupExpanded && (
                                          <div className="bg-slate-900 bg-opacity-50 border-t border-slate-600 p-3 space-y-2">
                                            {cards.map((item, copyIdx) => {
                                              const itemCost = parseFloat(item.purchase_price || 0);
                                              const inventoryItem = inventory.find(inv => inv.id === String(item.inventoryId));
                                              
                                              return (
                                                <div key={copyIdx} className="bg-slate-800 p-3 rounded border border-slate-600 text-xs space-y-2">
                                                  <div className="font-semibold text-slate-200">{item.set_name} ({item.set})</div>
                                                  {inventoryItem && (
                                                    <div className="text-xs text-slate-500">
                                                      From Inventory • Purchased {new Date(inventoryItem.purchase_date).toLocaleDateString()}
                                                    </div>
                                                  )}
                                                  <div className="grid grid-cols-4 gap-2">
                                                    <div className="bg-slate-700 p-2 rounded">
                                                      <div className="text-slate-400 text-xs mb-1">Purchase Price</div>
                                                      <div className="text-teal-300 font-semibold">${itemCost.toFixed(2)}</div>
                                                    </div>
                                                    <div className="bg-slate-700 p-2 rounded">
                                                      <div className="text-slate-400 text-xs mb-1">TCG Player</div>
                                                      <div className="text-teal-300 font-semibold text-sm">
                                                        <DecklistCardPrice key={`price-${item.name}-${item.set}-tcg-${copyIdx}`} name={item.name} set={item.set} priceType="tcg" />
                                                      </div>
                                                    </div>
                                                    <div className="bg-slate-700 p-2 rounded">
                                                      <div className="text-slate-400 text-xs mb-1">Card Kingdom</div>
                                                      <div className="text-cyan-300 font-semibold text-sm">
                                                        <DecklistCardPrice key={`price-${item.name}-${item.set}-ck-${copyIdx}`} name={item.name} set={item.set} priceType="ck" />
                                                      </div>
                                                    </div>
                                                    <button
                                                      onClick={async () => {
                                                        try {
                                                          const updatedCards = containerItems[container.id].map((card, idx) => {
                                                            if (idx === item.originalIdx) {
                                                              const qty = parseInt(card.quantity_used) || 1;
                                                              if (qty === 1) return null;
                                                              return { ...card, quantity_used: qty - 1 };
                                                            }
                                                            return card;
                                                          }).filter(Boolean);
                                                          
                                                          await fetch(`${API_BASE}/containers/${container.id}`, {
                                                            method: "PUT",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ cards: JSON.stringify(updatedCards) }),
                                                          });
                                                          
                                                          const invItem = inventory.find(inv => inv.id === String(item.inventoryId));
                                                          if (invItem) {
                                                            await fetch(`${API_BASE}/inventory/${item.inventoryId}`, {
                                                              method: "PUT",
                                                              headers: { "Content-Type": "application/json" },
                                                              body: JSON.stringify({
                                                                quantity: invItem.quantity + 1,
                                                                quantity_in_containers: (invItem.quantity_in_containers || 1) - 1,
                                                              }),
                                                            });
                                                          }
                                                          
                                                          await Promise.all([loadContainers(), loadInventory()]);
                                                        } catch (err) {
                                                          alert("Failed to remove card");
                                                        }
                                                      }}
                                                      className="btn-danger px-2 py-1 text-xs font-semibold h-fit"
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-sm">
                                No cards in this container.
                              </p>
                            )
                          ) : (
                            <p className="text-slate-400 text-sm">
                              Loading container contents...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {containers.length === 0 && (
                <p className="text-slate-400">No containers yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === "sales" && !isLoading && (
          <div className="space-y-6">
            {sales.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-bold mb-4">Sales History</h2>
                <div className="space-y-2">
                  {sales.map((sale) => {
                    const salePrice = parseFloat(sale.sale_price) || 0;
                    const saleDate = new Date(sale.created_at || sale.sold_date);

                    return (
                      <div
                        key={sale.id}
                        className="bg-slate-800 border border-slate-600 rounded p-4 flex justify-between items-center hover:bg-slate-700 transition"
                      >
                        <div>
                          <div className="font-semibold">
                            Container #{sale.container_id}
                          </div>
                          <div className="text-sm text-slate-400">
                            {saleDate.toLocaleDateString()} at {saleDate.toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400">
                            ${salePrice.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-400">
                            Sold
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-400" />
                Sales Analytics
              </h2>

              {sales.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {sales.map((sale) => {
                      const salePrice = parseFloat(sale.sale_price) || 0;
                      const deckCOGS = calculateDeckCOGS(sale.decklist_id);
                      const profit = salePrice - deckCOGS;
                      const profitPercentage =
                        deckCOGS > 0
                          ? ((profit / deckCOGS) * 100).toFixed(2)
                          : 0;
                      const container = containers.find(
                        (c) => c.id === sale.container_id,
                      );

                      return (
                        <div
                          key={sale.id}
                          className="bg-slate-800 border border-slate-600 p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-lg">
                                {container?.name || "Unknown Container"}
                              </div>
                              <div className="text-sm text-slate-400">
                                {new Date(sale.sold_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div
                              className={`text-lg font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-300"}`}
                            >
                              {profit >= 0 ? "+" : ""} ${profit.toFixed(2)}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="bg-slate-800 bg-opacity-50 border border-slate-600 p-3">
                              <div className="text-slate-400 text-xs">COGS</div>
                              <div className="font-semibold text-teal-300">
                                ${deckCOGS.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-slate-800 bg-opacity-50 border border-slate-600 p-3">
                              <div className="text-slate-400 text-xs">
                                Sale Price
                              </div>
                              <div className="font-semibold text-cyan-300">
                                ${salePrice.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-slate-800 bg-opacity-50 border border-slate-600 p-3">
                              <div className="text-slate-400 text-xs">
                                Profit %
                              </div>
                              <div
                                className={`font-semibold ${profit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                              >
                                {profitPercentage}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-700 hover:border-teal-500">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-800 bg-opacity-50 p-4 border border-slate-600">
                        <div className="text-slate-400 text-sm">
                          Total Sales
                        </div>
                        <div className="text-2xl font-bold text-teal-300">
                          {sales.length}
                        </div>
                      </div>
                      <div className="bg-slate-800 bg-opacity-50 p-4 border border-slate-600">
                        <div className="text-slate-400 text-sm">
                          Total Revenue
                        </div>
                        <div className="text-2xl font-bold text-cyan-300">
                          $
                          {sales
                            .reduce(
                              (sum, s) => sum + (parseFloat(s.sale_price) || 0),
                              0,
                            )
                            .toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-slate-800 bg-opacity-50 p-4 border border-slate-600">
                        <div className="text-slate-400 text-sm">
                          Total Profit
                        </div>
                        <div className="text-2xl font-bold text-emerald-300">
                          $
                          {sales
                            .reduce(
                              (sum, s) =>
                                sum +
                                ((parseFloat(s.sale_price) || 0) -
                                  calculateDeckCOGS(s.decklist_id)),
                              0,
                            )
                            .toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-400">
                  No sales recorded yet. Sell containers to see analytics here.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && !isLoading && (
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-300" />
                  Reorder Alerts
                </h2>
                {getReorderAlerts().length > 0 && (
                  <span className="bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm font-semibold">
                    {getReorderAlerts().length} items
                  </span>
                )}
              </div>
              {getReorderAlerts().length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {(() => {
                      const alerts = getReorderAlerts();
                      const groupedByName = {};
                      alerts.forEach((alert) => {
                        if (!groupedByName[alert.name]) {
                          groupedByName[alert.name] = [];
                        }
                        groupedByName[alert.name].push(alert);
                      });

                      return Object.entries(groupedByName).map(
                        ([cardName, cardAlerts]) => {
                          const totalQty = cardAlerts.reduce(
                            (sum, a) => sum + a.quantity,
                            0,
                          );
                          const totalUsedSold = cardAlerts.reduce(
                            (sum, a) => sum + (a.cardsInContainers || 0),
                            0,
                          );
                          const displayQty = totalQty + totalUsedSold;
                          const threshold =
                            reorderSettings[cardAlerts[0].reorder_type] || 5;
                          const percentOfThreshold =
                            (displayQty / threshold) * 100;
                          const severity =
                            percentOfThreshold < 25
                              ? "critical"
                              : percentOfThreshold < 75
                                ? "warning"
                                : "low";
                          const severityColor =
                            severity === "critical"
                              ? "bg-red-950 border-red-500"
                              : severity === "warning"
                                ? "bg-orange-950 border-orange-500"
                                : "bg-yellow-950 border-yellow-500";
                          const textColor =
                            severity === "critical"
                              ? "text-red-300"
                              : severity === "warning"
                                ? "text-orange-300"
                                : "text-yellow-300";
                          const isExpanded = expandedAlerts[cardName];

                          return (
                            <div key={cardName}>
                              <button
                                onClick={() =>
                                  setExpandedAlerts((prev) => ({
                                    ...prev,
                                    [cardName]: !prev[cardName],
                                  }))
                                }
                                className={`${severityColor} border p-3 rounded flex justify-between items-center text-sm w-full hover:border-opacity-100 transition text-left`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold truncate">
                                    {cardName}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {cardAlerts.length === 1
                                      ? cardAlerts[0].set_name
                                      : `${cardAlerts.length} sets`}{" "}
                                    • {cardAlerts[0].reorder_type}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                  <div className="text-right">
                                    <div
                                      className={`font-bold text-lg ${textColor}`}
                                    >
                                      {displayQty}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      of {threshold}
                                    </div>
                                  </div>
                                  <ChevronDown
                                    className={`w-4 h-4 transition ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="bg-slate-800 border border-slate-700 border-t-0 p-3 rounded-b space-y-2 text-xs">
                                  {cardAlerts.map((setItem) => (
                                    <div
                                      key={`${setItem.name}|${setItem.set_code}`}
                                      className="bg-slate-700 bg-opacity-40 p-2 rounded space-y-1"
                                    >
                                      <div className="flex justify-between">
                                        <div>
                                          <div className="text-slate-200">
                                            {setItem.set_name}
                                          </div>
                                          <div className="text-slate-500">
                                            {setItem.set_code}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-teal-300 font-semibold">
                                            {setItem.quantity}x
                                          </div>
                                          <div className="text-slate-400">
                                            @$
                                            {parseFloat(
                                              setItem.purchase_price || 0,
                                            ).toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="border-t border-slate-600 pt-2 mt-2 space-y-1">
                                    <div className="flex justify-between text-slate-300">
                                      <span>Used/Sold:</span>
                                      <span className="text-orange-300 font-semibold">
                                        {cardAlerts.reduce(
                                          (sum, a) =>
                                            sum + (a.cardsInContainers || 0),
                                          0,
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-slate-300">
                                      <span>Approx Reorder Total:</span>
                                      <span className="text-emerald-300">
                                        $
                                        {cardAlerts
                                          .reduce((sum, a) => {
                                            return (
                                              sum +
                                              (a.cardsInContainers || 0) *
                                                parseFloat(
                                                  a.purchase_price || 0,
                                                )
                                            );
                                          }, 0)
                                          .toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        },
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 bg-opacity-50 border border-slate-700 rounded p-4 text-center text-slate-400">
                  ✓ No reorder alerts
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">Inventory Statistics</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-600 p-4">
                  <div className="text-slate-400 text-sm">Total Unique Cards</div>
                  <div className="text-2xl font-bold text-teal-300">
                    {inventory.filter(card => (card.quantity || 0) > 0).length}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-600 p-4">
                  <div className="text-slate-400 text-sm">Total Quantity</div>
                  <div className="text-2xl font-bold text-teal-300">
                    {(() => {
                      const inventoryTotal = inventory.reduce(
                        (sum, card) => sum + (card.quantity || 0),
                        0,
                      );
                      // NOTE: Do NOT add containerTotal because cards in containers are already counted in inventory.quantity
                      // Containers are just storage/organization, not movement of cards
                      return inventoryTotal;
                    })()}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-600 p-4">
                  <div className="text-slate-400 text-sm">Total Value</div>
                  <div className="text-2xl font-bold text-teal-300">
                    $
                    {(() => {
                      const inventoryValue = inventory.reduce(
                        (sum, card) =>
                          sum + ((parseFloat(card.purchase_price) || 0) * (card.quantity || 0)),
                        0,
                      );
                      // NOTE: Do NOT add containerValue because cards in containers are already counted in inventory
                      // Containers are just storage/organization, not movement of cards out of inventory
                      // Total Value only changes when containers are SOLD (inventory actually decrements)
                      return inventoryValue.toFixed(2);
                    })()}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-600 p-4">
                  <div className="text-slate-400 text-sm">Total Purchased (60 days)</div>
                  <div className="text-2xl font-bold text-emerald-300">
                    ${totalPurchased60Days.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="grid gap-2">
                {usageHistory.length > 0 ? (
                  usageHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 border border-slate-600 p-3 text-sm"
                    >
                      <span className="font-semibold text-teal-300">
                        {entry.action}
                      </span>
                      <span className="text-slate-400">
                        {" "}
                        - {new Date(entry.created_at).toLocaleString()}
                      </span>
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
                    setSalePrice("");
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedContainerForSale && (
                <div className="mb-4">
                  <div className="bg-slate-800 border border-slate-600 p-3 mb-4">
                    <div className="text-sm text-slate-400">Container</div>
                    <div className="font-semibold">
                      {
                        containers.find(
                          (c) => c.id === selectedContainerForSale,
                        )?.name
                      }
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-600 p-3 mb-4">
                    <div className="text-sm text-slate-400">Estimated COGS</div>
                    <div className="font-semibold text-teal-300">
                      $
                      {calculateDeckCOGS(
                        containers.find(
                          (c) => c.id === selectedContainerForSale,
                        )?.decklist_id,
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Enter sale price"
                    className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
                  />
                </div>

                {salePrice && (
                  <div className="bg-emerald-900 bg-opacity-30 border border-green-500 p-3">
                    <div className="text-sm text-slate-400">
                      Estimated Profit
                    </div>
                    <div
                      className={`font-semibold text-lg ${salePrice - calculateDeckCOGS(containers.find((c) => c.id === selectedContainerForSale)?.decklist_id) >= 0 ? "text-emerald-400" : "text-red-300"}`}
                    >
                      $
                      {(
                        salePrice -
                        calculateDeckCOGS(
                          containers.find(
                            (c) => c.id === selectedContainerForSale,
                          )?.decklist_id,
                        )
                      ).toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={sellContainer}
                    className="flex-1 btn-primary px-4 py-2 font-semibold"
                  >
                    Confirm Sale
                  </button>
                  <button
                    onClick={() => {
                      setShowSellModal(false);
                      setSelectedContainerForSale(null);
                      setSalePrice("");
                    }}
                    className="flex-1 btn-secondary px-4 py-2 font-semibold"
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
                  <label className="block text-sm font-semibold mb-2">
                    Normal Cards
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.normal}
                    onChange={(e) =>
                      setReorderSettings({
                        ...reorderSettings,
                        normal: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Lands
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.land}
                    onChange={(e) =>
                      setReorderSettings({
                        ...reorderSettings,
                        land: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Bulk Items
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.bulk}
                    onChange={(e) =>
                      setReorderSettings({
                        ...reorderSettings,
                        bulk: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
                  />
                </div>
                <div className="border-t border-slate-700 hover:border-teal-500 pt-4 mt-4">
                  <button
                    onClick={() => {
                      setPriceCache({});
                      setSuccessMessage("Price cache cleared successfully!");
                      setTimeout(() => setSuccessMessage(""), 3000);
                    }}
                    className="w-full btn-accent mb-2"
                  >
                    Refresh Price Cache
                  </button>
                  <p className="text-xs text-slate-400">
                    Clears cached card prices and fetches fresh data
                  </p>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button
                    onClick={saveReorderSettings}
                    className="flex-1 btn-primary px-4 py-2 font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 btn-secondary px-4 py-2 font-semibold"
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

export default function MTGInventoryTracker() {
  return (
    <ErrorBoundary>
      <PriceCacheProvider>
        <MTGInventoryTrackerContent />
      </PriceCacheProvider>
    </ErrorBoundary>
  );
}
