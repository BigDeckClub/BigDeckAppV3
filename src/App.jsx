import React, { useState, useEffect, lazy, Suspense, useRef, useMemo, useCallback } from "react";
import { PriceCacheProvider } from "./context/PriceCacheContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider, useToast, TOAST_TYPES } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { InventoryProvider, useInventory } from "./context/InventoryContext";
import { UndoProvider } from "./context/UndoContext";
import { LoginForm } from "./components/LoginForm";
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorBoundaryWithRetry from "./components/ErrorBoundaryWithRetry";
import { ToastContainer } from "./components/ToastContainer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { OfflineBanner } from "./components/OfflineBanner";
import { useApi } from "./hooks/useApi";
import { TabLoadingSpinner } from "./components/TabLoadingSpinner";
import { Navigation } from "./components/Navigation";
import { useCardSearch } from "./hooks/useCardSearch";
import { getAllSets } from "./utils/scryfallApi";
import { FullPageSpinner, KeyboardShortcutsHelp } from "./components/ui";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { AIChatWidget } from "./components/AIChatWidget";

// Lazy load tab components for code splitting
const InventoryTab = lazy(() => import("./components/InventoryTab"));
const ImportTab = lazy(() => import("./components/ImportTab"));
const DashboardTab = lazy(() => import("./components/DashboardTab"));
const DeckTab = lazy(() => import("./components/DeckTab"));
const AITab = lazy(() => import("./components/AITab"));
const SettingsTab = lazy(() => import("./components/SettingsTab"));
const AdminTab = lazy(() => import("./components/admin/AdminTab"));
const AutobuyTab = lazy(() => import("./components/AutobuyTab"));

function MTGInventoryTrackerContent() {
  // ALL hooks must be called before any conditional returns
  const { user, loading: authLoading } = useAuth();
  const { post } = useApi();
  const { showToast } = useToast();

  // Custom hooks for extracted functionality
  const {
    searchResults,
    showDropdown,
    setShowDropdown,
    searchIsLoading,
    handleSearch,
  } = useCardSearch();

  // Use inventory context instead of hook
  const {
    inventory,
    loadInventory,
    addInventoryItem,
  } = useInventory();

  // ALL useState hooks
  const [activeTab, setActiveTab] = useState("inventory");
  const [isLoading, setIsLoading] = useState(false);
  const [deckRefreshTrigger, setDeckRefreshTrigger] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const [allSets, setAllSets] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedCards, setExpandedCards] = useState({});

  // Ref for search input focus
  const searchInputRef = useRef(null);

  // Keyboard shortcuts handlers
  const focusSearch = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, []);

  const handleEscape = useCallback(() => {
    // Close keyboard help if open
    if (showKeyboardHelp) {
      setShowKeyboardHelp(false);
      return;
    }
    // Blur active element if in an input
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      document.activeElement.blur();
    }
  }, [showKeyboardHelp]);

  const toggleKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(prev => !prev);
  }, []);

  // Keyboard shortcuts configuration
  const shortcuts = useMemo(() => [
    { key: '/', handler: focusSearch, description: 'Focus search' },
    { key: 'k', ctrlKey: true, handler: focusSearch, description: 'Focus search' },
    { key: 'Escape', handler: handleEscape, allowInInput: true, description: 'Close modal / Clear' },
    { key: '?', handler: toggleKeyboardHelp, description: 'Show keyboard shortcuts' },
  ], [focusSearch, handleEscape, toggleKeyboardHelp]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(shortcuts, { enabled: !!user });

  const loadAllSets = useCallback(async () => {
    try {
      const validSets = await getAllSets();
      setAllSets(validSets);
    } catch (error) {
      console.error('[APP] Failed to load sets:', error);
      showToast('Failed to load card sets. Some features may be limited.', TOAST_TYPES.WARNING);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) return;
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

  const handleSell = useCallback(async (saleData) => {
    try {
      await post('/sales', saleData);
      if (saleData.itemType === 'deck') {
        setDeckRefreshTrigger(prev => prev + 1);
        await loadInventory();
      }
      showToast(`${saleData.itemName} sold successfully!`, TOAST_TYPES.SUCCESS);
    } catch (_error) {
      showToast("Failed to record sale", TOAST_TYPES.ERROR);
      throw _error;
    }
  }, [post, loadInventory, showToast]);

  if (authLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <LoginForm onSuccess={() => { }} />;
  }

  return (
    <div className="min-h-screen bda-bg text-[var(--bda-text)]">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 main-content md:px-4 px-3">
        {isLoading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 animate-spin mx-auto text-[var(--bda-primary)] border-2 border-[var(--bda-primary)] border-t-transparent rounded-full"></div>
          </div>
        )}

        {activeTab === "inventory" && !isLoading && (
          <ErrorBoundaryWithRetry>
            <Suspense fallback={<TabLoadingSpinner />}>
              <InventoryTab
                successMessage={successMessage}
                setSuccessMessage={setSuccessMessage}
                expandedCards={expandedCards}
                setExpandedCards={setExpandedCards}
                deckRefreshTrigger={deckRefreshTrigger}
                onSell={handleSell}
                searchRef={searchInputRef}
              />
            </Suspense>
          </ErrorBoundaryWithRetry>
        )}

        {activeTab === "imports" && !isLoading && (
          <ErrorBoundaryWithRetry>
            <Suspense fallback={<TabLoadingSpinner />}>
              <ImportTab
                allSets={allSets}
                searchResults={searchResults}
                showDropdown={showDropdown}
                setShowDropdown={setShowDropdown}
                handleSearch={handleSearch}
                searchIsLoading={searchIsLoading}
                addInventoryItem={addInventoryItem}
              />
            </Suspense>
          </ErrorBoundaryWithRetry>
        )}

        {activeTab === "autobuy" && !isLoading && (
          <ErrorBoundaryWithRetry>
            <Suspense fallback={<TabLoadingSpinner />}>
              <AutobuyTab inventory={inventory} />
            </Suspense>
          </ErrorBoundaryWithRetry>
        )}

        {activeTab === "dashboard" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <DashboardTab inventory={inventory} />
          </Suspense>
        )}

        {activeTab === "decks" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <DeckTab
              onDeckCreatedOrDeleted={() => setDeckRefreshTrigger(prev => prev + 1)}
              onInventoryUpdate={loadInventory}
            />
          </Suspense>
        )}

        {activeTab === "ai" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <AITab />
          </Suspense>
        )}

        {activeTab === "settings" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <SettingsTab inventory={inventory} />
          </Suspense>
        )}
        {activeTab === "marketplace" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <AdminTab />
          </Suspense>
        )}
      </main>



      <KeyboardShortcutsHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
      <ToastContainer />
      <ConfirmDialog />
      <OfflineBanner />
      <AIChatWidget isAuthenticated={!!user} />
    </div>
  );
}

import { ThemeProvider } from "./context/ThemeContext";

function MTGInventoryTracker() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PriceCacheProvider>
          <ToastProvider>
            <ConfirmProvider>
              <UndoProvider>
                <InventoryProvider>
                  <MTGInventoryTrackerContent />
                </InventoryProvider>
              </UndoProvider>
            </ConfirmProvider>
          </ToastProvider>
        </PriceCacheProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MTGInventoryTracker />
    </ThemeProvider>
  );
}