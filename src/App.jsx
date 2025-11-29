import React, { useState, useEffect } from "react";
import {
  Layers,
  FileText,
  Package,
  TrendingUp,
  DollarSign,
  Settings,
  RefreshCw,
  Download,
} from "lucide-react";
import { useDebounce } from "./utils/useDebounce";
import { InventoryTab } from "./components/InventoryTab";
import { DecklistTab } from "./components/DecklistTab";
import { ContainersTab } from "./components/ContainersTab";
import { SalesTab } from "./components/SalesTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { ImportTab } from "./components/ImportTab";
import { SettingsPanel } from "./components/SettingsPanel";
import { SellModal } from "./components/SellModal";
import { PriceCacheProvider, usePriceCache } from "./context/PriceCacheContext";
import DecklistCardPrice from "./components/DecklistCardPrice";
import { FloatingDollarSigns } from "./components/FloatingDollarSigns";
import ErrorBoundary from "./components/ErrorBoundary";
import { useApi } from "./hooks/useApi";

const API_BASE = "/api";

function MTGInventoryTrackerContent() {
  const { getPrice } = usePriceCache();
  const { get, post, put, del } = useApi();
  
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState([]);
  const [decklists, setDecklists] = useState([]);
  const [containers, setContainers] = useState([]);
  const [sales, setSales] = useState([]);
  const [imports, setImports] = useState([]);
  const [reorderSettings, setReorderSettings] = useState({
    bulk: 12,
    land: 20,
    normal: 4,
  });
  const [usageHistory, setUsageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPurchased60Days, setTotalPurchased60Days] = useState(0);

  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedContainerForSale, setSelectedContainerForSale] = useState(null);
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
    location: "",
    isSharedLocation: false,
  });
  const [defaultSearchSet, setDefaultSearchSet] = useState("");
  const [allSets, setAllSets] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [lastUsedSets, setLastUsedSets] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [showSaleAnimation, setShowSaleAnimation] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const loadInventory = async () => {
    try {
      const data = await get(`${API_BASE}/inventory`);
      const sortedData = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setInventory(sortedData);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const recentTotal = sortedData
        .filter(item => new Date(item.purchase_date) >= sixtyDaysAgo)
        .reduce((sum, item) => sum + ((parseFloat(item.purchase_price) || 0) * (item.quantity || 0)), 0);
      setTotalPurchased60Days(recentTotal);
    } catch (error) {
      setInventory([]);
    }
  };

  const loadDecklists = async () => {
    try {
      const data = await get(`${API_BASE}/decklists`);
      setDecklists(data || []);
    } catch (error) {}
  };

  const loadContainers = async () => {
    try {
      const data = await get(`${API_BASE}/containers`);
      setContainers(data || []);
    } catch (error) {
      setContainers([]);
    }
  };

  const loadSales = async () => {
    try {
      const data = await get(`${API_BASE}/sales`);
      setSales(data || []);
    } catch (error) {
      setSales([]);
    }
  };

  const loadImports = async () => {
    try {
      const data = await get(`${API_BASE}/imports`);
      setImports(data || []);
    } catch (error) {
      setImports([]);
    }
  };

  const loadReorderSettings = async () => {
    try {
      const data = await get(`${API_BASE}/settings/reorder_thresholds`);
      if (data) {
        setReorderSettings(data);
      }
    } catch (error) {}
  };

  const saveReorderSettings = async () => {
    try {
      await post(`${API_BASE}/settings/reorder_thresholds`, { value: reorderSettings });
      setShowSettings(false);
    } catch (error) {}
  };

  const loadUsageHistory = async () => {
    try {
      const history = await get(`${API_BASE}/usage-history?limit=50`);
      setUsageHistory(history);
    } catch (error) {
      setUsageHistory([]);
    }
  };

  const recordUsage = async (action, details) => {
    try {
      await post(`${API_BASE}/usage-history`, { action, details });
      await loadUsageHistory();
    } catch (error) {}
  };

  const loadAllSets = async () => {
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
  };

  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
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

      const results = (data.data || []).map((card) => ({
        name: card.name,
        set: card.set.toUpperCase(),
        setName: card.set_name,
        rarity: card.rarity,
        imageUrl: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small,
      }));

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (debouncedSearchQuery) {
      handleSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadInventory(),
        loadDecklists(),
        loadContainers(),
        loadSales(),
        loadReorderSettings(),
        loadUsageHistory(),
        loadAllSets(),
      ]);
      setIsLoading(false);
    };
    loadAllData();
  }, []);

  const addInventoryItem = async (item) => {
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
  };

  const updateInventoryItem = async (id, updates) => {
    try {
      await put(`${API_BASE}/inventory/${id}`, updates);
      await loadInventory();
      setEditingId(null);
      setSuccessMessage("Card updated!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      alert("Error updating card");
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await del(`${API_BASE}/inventory/${id}`);
      await loadInventory();
    } catch (error) {}
  };

  const startEditingItem = (item) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity,
      purchase_price: item.purchase_price || "",
      reorder_type: item.reorder_type || "normal",
    });
  };

  const selectCard = (card) => {
    setNewEntry({ ...newEntry, selectedSet: card });
    setSearchQuery(card.name);
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
      purchase_price: newEntry.purchasePrice ? parseFloat(newEntry.purchasePrice) : null,
      reorder_type: newEntry.reorderType,
      image_url: newEntry.selectedSet.imageUrl,
      location: newEntry.location || "Unspecified",
      is_shared_location: newEntry.isSharedLocation,
    };

    if (await addInventoryItem(item)) {
      setNewEntry({
        quantity: 1,
        purchaseDate: new Date().toISOString().split("T")[0],
        purchasePrice: "",
        reorderType: "normal",
        selectedSet: null,
        location: "",
        isSharedLocation: false,
      });
    }
  };

  const calculateDeckCOGS = (decklistId) => {
    const deck = decklists.find((d) => d.id === decklistId);
    if (!deck || !deck.decklist) return 0;

    let totalCost = 0;
    const lines = deck.decklist.split("\n");

    lines.forEach((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();

        const inventoryCard = inventory.find(
          (card) => card.name.toLowerCase() === cardName.toLowerCase()
        );

        if (inventoryCard && inventoryCard.purchase_price) {
          totalCost += quantity * (parseFloat(inventoryCard.purchase_price) || 0);
        }
      }
    });

    return totalCost;
  };

  const sellContainer = async () => {
    const priceToParse = parseFloat(salePrice);
    if (!selectedContainerForSale || !priceToParse || isNaN(priceToParse)) {
      setSuccessMessage("Error: Please enter a valid sale price");
      return;
    }

    try {
      const containerName = containers.find(c => c.id === selectedContainerForSale)?.name || 'Unknown';
      await post(`${API_BASE}/containers/${selectedContainerForSale}/sell`, {
        salePrice: priceToParse,
      });

      await Promise.all([loadSales(), loadContainers(), loadInventory()]);
      
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

  const openSellModal = (containerId) => {
    setSelectedContainerForSale(containerId);
    setShowSellModal(true);
  };

  const navItems = [
    { id: "inventory", icon: Layers, label: "Inventory" },
    { id: "decklists", icon: FileText, label: "Decks" },
    { id: "containers", icon: Package, label: "Locations" },
    { id: "imports", icon: Download, label: "Imports" },
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
              onClick={() => setActiveTab("imports")}
              className={`px-4 py-2 nav-tab inactive ${activeTab === "imports" ? "btn-primary" : "hover:shadow-lg"}`}
            >
              <Download className="w-5 h-5 inline mr-2" />
              Imports
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

        {/* Decklists Tab */}
        {activeTab === "decklists" && !isLoading && (
          <DecklistTab
            decklists={decklists}
            inventory={inventory}
            defaultSearchSet={defaultSearchSet}
            lastUsedSets={lastUsedSets}
            setLastUsedSets={setLastUsedSets}
            onLoadDecklists={loadDecklists}
            successMessage={successMessage}
            setSuccessMessage={setSuccessMessage}
          />
        )}

        {/* Containers Tab */}
        {activeTab === "containers" && !isLoading && (
          <ContainersTab
            containers={containers}
            containerItems={containerItems}
            decklists={decklists}
            inventory={inventory}
            onLoadContainers={loadContainers}
            onLoadInventory={loadInventory}
            onOpenSellModal={openSellModal}
            successMessage={successMessage}
            setSuccessMessage={setSuccessMessage}
          />
        )}

        {/* Imports Tab */}
        {activeTab === "imports" && !isLoading && (
          <ImportTab
            imports={imports}
            onLoadImports={loadImports}
            successMessage={successMessage}
            setSuccessMessage={setSuccessMessage}
          />
        )}

        {/* Sales Tab */}
        {activeTab === "sales" && !isLoading && (
          <SalesTab
            sales={sales}
            containers={containers}
            decklists={decklists}
            inventory={inventory}
            calculateDeckCOGS={calculateDeckCOGS}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && !isLoading && (
          <AnalyticsTab
            inventory={inventory}
            containerItems={containerItems}
            usageHistory={usageHistory}
            reorderSettings={reorderSettings}
            totalPurchased60Days={totalPurchased60Days}
          />
        )}

        {/* Sell Modal */}
        <SellModal
          showSellModal={showSellModal}
          setShowSellModal={setShowSellModal}
          selectedContainerForSale={selectedContainerForSale}
          setSelectedContainerForSale={setSelectedContainerForSale}
          salePrice={salePrice}
          setSalePrice={setSalePrice}
          containers={containers}
          calculateDeckCOGS={calculateDeckCOGS}
          onSellContainer={sellContainer}
        />

        {/* Settings Panel */}
        <SettingsPanel
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          reorderSettings={reorderSettings}
          setReorderSettings={setReorderSettings}
          onSaveReorderSettings={saveReorderSettings}
          setSuccessMessage={setSuccessMessage}
        />
      </main>
    </div>
  );
}

function MTGInventoryTracker() {
  return (
    <ErrorBoundary>
      <PriceCacheProvider>
        <MTGInventoryTrackerContent />
      </PriceCacheProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return <MTGInventoryTracker />;
}
