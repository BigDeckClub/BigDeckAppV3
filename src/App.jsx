import React, { useState, useEffect, Suspense, lazy, useCallback } from "react";
import {
  Layers,
  Download,
  BarChart3,
  BookOpen,
  TrendingUp,
  Settings,
} from "lucide-react";
import { useDebounce } from "./utils/useDebounce";
import { PriceCacheProvider, usePriceCache } from "./context/PriceCacheContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginForm } from "./components/LoginForm";
import { UserDropdown } from "./components/UserDropdown";
import ErrorBoundary from "./components/ErrorBoundary";
import { useApi } from "./hooks/useApi";
import { TutorialModal } from "./components/TutorialModal";
import { TabLoadingSpinner } from "./components/TabLoadingSpinner";
import { getCachedSearch, setCachedSearch, getPopularCardMatches } from "./utils/popularCards";

// Lazy load tab components for code splitting
const InventoryTab = lazy(() => import("./components/InventoryTab"));
const ImportTab = lazy(() => import("./components/ImportTab"));
const AnalyticsTab = lazy(() => import("./components/AnalyticsTab"));
const DeckTab = lazy(() => import("./components/DeckTab"));
const SalesHistoryTab = lazy(() => import("./components/SalesHistoryTab"));
const SettingsTab = lazy(() => import("./components/SettingsTab"));

const API_BASE = "/api";

function MTGInventoryTrackerContent() {
  // ALL hooks must be called before any conditional returns
  const { user, loading: authLoading } = useAuth();
  const { getPrice } = usePriceCache();
  const { get, post, put, del } = useApi();

  // ALL useState hooks
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState([]);
  const [imports, setImports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deckRefreshTrigger, setDeckRefreshTrigger] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [selectedCardSets, setSelectedCardSets] = useState([]);

  const [newEntry, setNewEntry] = useState({
    quantity: 1,
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    reorderType: "normal",
    selectedSet: null,
  });
  const [defaultSearchSet, setDefaultSearchSet] = useState("");
  const [allSets, setAllSets] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [lastUsedSets, setLastUsedSets] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedCards, setExpandedCards] = useState({});

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const loadInventory = useCallback(async () => {
    console.log('=== LOAD INVENTORY CALLED ===');
    try {
      const data = await get(`${API_BASE}/inventory`);
      const sortedData = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      console.log('Inventory loaded, total items:', sortedData.length);
      
      // Check item 6's alert status
      const item6 = sortedData.find(i => i.id === 6);
      console.log('Item 6 low_inventory_alert:', item6?.low_inventory_alert);
      
      setInventory(sortedData);
      console.log('setInventory called - state updated');
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    }
  }, [get]);



  const loadImports = useCallback(async () => {
    try {
      const data = await get(`${API_BASE}/imports`);
      setImports(data || []);
    } catch (error) {
      setImports([]);
    }
  }, [get]);

  const loadAllSets = useCallback(async () => {
    try {
      const response = await fetch("https://api.scryfall.com/sets");
      const data = await response.json();
      if (data.data) {
        const validSets = data.data
          .filter((set) => set.set_type !== "token" && set.set_type !== "memorabilia")
          .map((set) => ({ code: set.code.toUpperCase(), name: set.name }));
        setAllSets(validSets);
      }
    } catch (error) {}
  }, []);

  // Score function for smart search ranking
  const scoreCardMatch = useCallback((cardName, query) => {
    const lowerName = cardName.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match (highest priority)
    if (lowerName === lowerQuery) return 1000;
    
    // Starts with query (high priority)
    if (lowerName.startsWith(lowerQuery)) return 500;
    
    // Multi-word query matching (e.g., "sol r" -> "Sol Ring")
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
    const cardWords = lowerName.split(/\s+/);
    
    if (queryWords.length > 1) {
      // Check if each query word matches a card word at the start (in order)
      let matchCount = 0;
      let cardWordIdx = 0;
      
      for (const qWord of queryWords) {
        while (cardWordIdx < cardWords.length) {
          if (cardWords[cardWordIdx].startsWith(qWord)) {
            matchCount++;
            cardWordIdx++;
            break;
          }
          cardWordIdx++;
        }
      }
      
      // If all query words matched card words in order, give high score
      if (matchCount === queryWords.length) {
        return 450; // Just below exact starts-with match
      }
    }
    
    // Single word or partial word boundary match
    const words = lowerName.split(/\s+/);
    if (words.some(word => word.startsWith(lowerQuery))) return 400;
    
    // Contains query as substring (medium priority)
    const containsIndex = lowerName.indexOf(lowerQuery);
    if (containsIndex !== -1) {
      // Prioritize matches closer to the start
      return 200 - (containsIndex / lowerName.length) * 100;
    }
    
    // Fuzzy match - each character of query found in order (low priority)
    let matchPos = 0;
    for (let i = 0; i < lowerQuery.length; i++) {
      matchPos = lowerName.indexOf(lowerQuery[i], matchPos);
      if (matchPos === -1) return 0;
      matchPos++;
    }
    return 50;
  }, []);

  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Check cache first
    const cached = getCachedSearch(query);
    if (cached) {
      setSearchResults(cached);
      setShowDropdown(true);
      return;
    }

    setSearchIsLoading(true);
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`
      );

      if (!response.ok) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      const data = await response.json();

      let results = (data.data || []).map((card) => ({
        name: card.name,
        set: card.set.toUpperCase(),
        setName: card.set_name,
        rarity: card.rarity,
        imageUrl: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small,
      }));

      // Sort by relevance score
      results = results.sort((a, b) => {
        const scoreA = scoreCardMatch(a.name, query);
        const scoreB = scoreCardMatch(b.name, query);
        return scoreB - scoreA; // Descending order
      });

      // Limit to top 15 results
      results = results.slice(0, 15);

      // Cache the results
      setCachedSearch(query, results);

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearchIsLoading(false);
    }
  }, [scoreCardMatch]);

  useEffect(() => {
    if (debouncedSearchQuery) {
      handleSearch(debouncedSearchQuery);
    } else {
      // Show popular cards when search is empty
      const popular = getPopularCardMatches(searchQuery);
      if (searchQuery.length > 0 && popular.length > 0) {
        setSearchResults(popular);
        setShowDropdown(true);
      } else if (searchQuery.length === 0) {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }
  }, [debouncedSearchQuery, searchQuery]);

  useEffect(() => {
    if (!user) return; // Guard inside effect - don't load data without user
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadInventory(),
        loadAllSets(),
      ]);
      setIsLoading(false);
    };
    loadAllData();
  }, [user, loadInventory, loadAllSets]);

  const addInventoryItem = useCallback(async (item) => {
    try {
      await post(`${API_BASE}/inventory`, item);
      await loadInventory();
      setSuccessMessage("Card added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      alert("Error adding card: " + error.message);
      return false;
    }
  }, [post, loadInventory]);

  const updateInventoryItem = useCallback(async (id, updates) => {
    try {
      // Add last_modified timestamp to track changes
      const updateWithTimestamp = {
        ...updates,
        last_modified: new Date().toISOString(),
      };
      await put(`${API_BASE}/inventory/${id}`, updateWithTimestamp);
      await loadInventory();
      setEditingId(null);
      setSuccessMessage("Card updated!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      alert("Error updating card");
    }
  }, [put, loadInventory]);

  const deleteInventoryItem = useCallback(async (id) => {
    try {
      await put(`${API_BASE}/inventory/${id}`, { folder: 'Uncategorized' });
      await loadInventory();
    } catch (error) {}
  }, [put, loadInventory]);

  const startEditingItem = useCallback((item) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity,
      purchase_price: item.purchase_price || "",
      folder: item.folder || "Uncategorized",
      reorder_type: item.reorder_type || "normal",
    });
  }, []);

  const selectCard = useCallback((card) => {
    setNewEntry(prev => ({ ...prev, selectedSet: card }));
    setSearchQuery(card.name);
    setShowDropdown(false);
  }, []);

  const addCard = useCallback(async () => {
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
      purchase_price: newEntry.purchasePrice ? parseFloat(newEntry.purchasePrice) : null,
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
        folder: "Uncategorized",
      });
      setSearchQuery("");
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [newEntry, addInventoryItem]);


  const handleSell = useCallback(async (saleData) => {
    try {
      await post(`${API_BASE}/sales`, saleData);
      if (saleData.itemType === 'deck') {
        setDeckRefreshTrigger(prev => prev + 1);
        await loadInventory();
      }
    } catch (error) {
      throw error;
    }
  }, [post, loadInventory]);

  // Conditional returns AFTER all hooks are called
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 animate-spin text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onSuccess={() => {}} />;
  }

  const navItems = [
    { id: "inventory", icon: Layers, label: "Inventory" },
    { id: "imports", icon: Download, label: "Imports" },
    { id: "analytics", icon: BarChart3, label: "Analytics" },
    { id: "decks", icon: BookOpen, label: "Decks" },
    { id: "sales", icon: TrendingUp, label: "Sales" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Desktop Navigation */}
      <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-xl shadow-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 app-header flex items-center justify-between">
          <div className="desktop-nav flex gap-2 items-center">
            <button
              onClick={() => setShowTutorial(true)}
              className="px-3 py-2 text-slate-400 hover:text-teal-400 text-sm font-medium transition"
              title="View tutorial"
            >
              ?
            </button>
          </div>
          <div className="desktop-nav flex gap-2 items-center">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "inventory" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <Layers className="w-5 h-5 inline mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab("imports")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "imports" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <Download className="w-5 h-5 inline mr-2" />
              Imports
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "analytics" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <BarChart3 className="w-5 h-5 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("decks")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "decks" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <BookOpen className="w-5 h-5 inline mr-2" />
              Decks
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "sales" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Sales
            </button>
          </div>
          <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
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
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 main-content md:px-4 px-3">
        {isLoading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Suspense boundary for lazy-loaded tab components */}
        <Suspense fallback={<TabLoadingSpinner />}>
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
              searchIsLoading={searchIsLoading}
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
              handleSearch={handleSearch}
              deckRefreshTrigger={deckRefreshTrigger}
              onLoadInventory={loadInventory}
              onSell={handleSell}
            />
          )}

          {/* Imports Tab */}
          {activeTab === "imports" && !isLoading && (
            <ImportTab
              imports={imports}
              onLoadImports={loadImports}
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
              handleSearch={handleSearch}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && !isLoading && (
            <AnalyticsTab inventory={inventory} />
          )}

          {/* Decks Tab */}
          {activeTab === "decks" && !isLoading && (
            <DeckTab 
              onDeckCreatedOrDeleted={() => setDeckRefreshTrigger(prev => prev + 1)} 
              onInventoryUpdate={loadInventory}
            />
          )}

          {/* Sales History Tab */}
          {activeTab === "sales" && !isLoading && (
            <SalesHistoryTab />
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && !isLoading && (
            <SettingsTab inventory={inventory} />
          )}
        </Suspense>

      </main>

      {/* Tutorial Modal */}
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}

function MTGInventoryTracker() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PriceCacheProvider>
          <MTGInventoryTrackerContent />
        </PriceCacheProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return <MTGInventoryTracker />;
}
