import React, { useState, useEffect, lazy, useCallback } from "react";
import { PriceCacheProvider } from "./context/PriceCacheContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider, useToast, TOAST_TYPES } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { LoginForm } from "./components/LoginForm";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastContainer } from "./components/ToastContainer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { OfflineBanner } from "./components/OfflineBanner";
import { useApi } from "./hooks/useApi";
import { TutorialModal } from "./components/TutorialModal";
import { Navigation } from "./components/Navigation";
import { useCardSearch } from "./hooks/useCardSearch";
import { useInventoryOperations } from "./hooks/useInventoryOperations";
import { API_BASE } from "./config/api";

// Lazy load tab components for code splitting
const InventoryTab = lazy(() => import("./components/InventoryTab"));
const ImportTab = lazy(() => import("./components/ImportTab"));
const AnalyticsTab = lazy(() => import("./components/AnalyticsTab"));
const DeckTab = lazy(() => import("./components/DeckTab"));
const SalesHistoryTab = lazy(() => import("./components/SalesHistoryTab"));
const SettingsTab = lazy(() => import("./components/SettingsTab"));

function MTGInventoryTrackerContent() {
  // ALL hooks must be called before any conditional returns
  const { user, loading: authLoading } = useAuth();
  const { get, post } = useApi();
  const { showToast } = useToast();

  // Custom hooks for extracted functionality
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    showDropdown,
    setShowDropdown,
    searchIsLoading,
    handleSearch,
  } = useCardSearch();

  const {
    inventory,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    editingId,
    editForm,
    setEditForm,
    startEditingItem,
  } = useInventoryOperations();

  // ALL useState hooks
  const [activeTab, setActiveTab] = useState("inventory");
  const [imports, setImports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deckRefreshTrigger, setDeckRefreshTrigger] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
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
  const [expandedCards, setExpandedCards] = useState({});

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

  const selectCard = useCallback((card) => {
    setNewEntry(prev => ({ ...prev, selectedSet: card }));
    setSearchQuery(card.name);
    setShowDropdown(false);
  }, [setSearchQuery, setShowDropdown]);

  const addCard = useCallback(async () => {
    if (!newEntry.selectedSet) {
      showToast("Please select a card", TOAST_TYPES.WARNING);
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
  }, [newEntry, addInventoryItem, showToast, setSearchQuery, setSearchResults, setShowDropdown]);

  const handleSell = useCallback(async (saleData) => {
    try {
      await post(`${API_BASE}/sales`, saleData);
      if (saleData.itemType === 'deck') {
        setDeckRefreshTrigger(prev => prev + 1);
        await loadInventory();
      }
      showToast(`${saleData.itemName} sold successfully!`, TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast("Failed to record sale", TOAST_TYPES.ERROR);
      throw error;
    }
  }, [post, loadInventory, showToast]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onShowTutorial={() => setShowTutorial(true)}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 main-content md:px-4 px-3">
        {isLoading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
          </div>
        )}

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
            searchIsLoading={searchIsLoading}
            addInventoryItem={addInventoryItem}
          />
        )}

        {activeTab === "analytics" && !isLoading && <AnalyticsTab inventory={inventory} />}

        {activeTab === "decks" && !isLoading && (
          <DeckTab
            onDeckCreatedOrDeleted={() => setDeckRefreshTrigger(prev => prev + 1)}
            onInventoryUpdate={loadInventory}
          />
        )}

        {activeTab === "sales" && !isLoading && <SalesHistoryTab />}

        {activeTab === "settings" && !isLoading && <SettingsTab inventory={inventory} />}
      </main>

      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      <ToastContainer />
      <ConfirmDialog />
      <OfflineBanner />
    </div>
  );
}

function MTGInventoryTracker() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PriceCacheProvider>
          <ToastProvider>
            <ConfirmProvider>
              <MTGInventoryTrackerContent />
            </ConfirmProvider>
          </ToastProvider>
        </PriceCacheProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return <MTGInventoryTracker />;
}
