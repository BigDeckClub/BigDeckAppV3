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
  const [activeTab, setActiveTab] = useState("dashboard"); // Default to Dashboard for new look
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
    <div className="min-h-screen text-[var(--text-main)] overflow-x-hidden">
      {/* Animated Background */}
      <div className="bg-mesh-container">
        <div className="bg-mesh-blob blob-1"></div>
        <div className="bg-mesh-blob blob-2"></div>
        <div className="bg-mesh-blob blob-3"></div>
      </div>

      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area - Shifted for Sidebar */}
      <main className="transition-all duration-300 md:ml-64 p-3 md:p-8 pb-32 md:pb-8 max-w-7xl mx-auto">
        {isLoading && (
          <div className="text-center py-20 flex justify-center">
            <div className="w-10 h-10 animate-spin text-[var(--primary)] border-2 border-[var(--primary)] border-t-transparent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && (
          <div className="animate-fade-in">
            {activeTab === "inventory" && (
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

            {activeTab === "imports" && (
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

            {activeTab === "autobuy" && (
              <ErrorBoundaryWithRetry>
                <Suspense fallback={<TabLoadingSpinner />}>
                  <AutobuyTab inventory={inventory} />
                </Suspense>
              </ErrorBoundaryWithRetry>
            )}

            {activeTab === "dashboard" && (
              <Suspense fallback={<TabLoadingSpinner />}>
                <DashboardTab inventory={inventory} />
              </Suspense>
            )}

            {activeTab === "decks" && (
              <Suspense fallback={<TabLoadingSpinner />}>
                <DeckTab
                  onDeckCreatedOrDeleted={() => setDeckRefreshTrigger(prev => prev + 1)}
                  onInventoryUpdate={loadInventory}
                />
              </Suspense>
            )}

            {activeTab === "ai" && (
              <Suspense fallback={<TabLoadingSpinner />}>
                <AITab />
              </Suspense>
            )}

            {activeTab === "settings" && (
              <Suspense fallback={<TabLoadingSpinner />}>
                <SettingsTab inventory={inventory} />
              </Suspense>
            )}

            {activeTab === "marketplace" && (
              <Suspense fallback={<TabLoadingSpinner />}>
                <AdminTab />
              </Suspense>
            )}
          </div>
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
    </ErrorBoundary>
  );
}

// Separate AuthProvider to use it in App
// Wait, original file wrapped AuthProvider inside ErrorBoundary but outside everything else
// I will keep the Context nesting same as before but ensure new theme context is used if needed.
// ThemeProvider wraps everything.

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <MTGInventoryTracker />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}