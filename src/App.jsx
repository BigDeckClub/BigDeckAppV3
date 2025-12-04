import React, { useState, useEffect, lazy, useCallback, Suspense } from "react";
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
import { TutorialModal } from "./components/TutorialModal";
import { TabLoadingSpinner } from "./components/TabLoadingSpinner";
import { Navigation } from "./components/Navigation";
import { useCardSearch } from "./hooks/useCardSearch";
import { getAllSets } from "./utils/scryfallApi";
import { FullPageSpinner } from "./components/ui";

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
  const [showTutorial, setShowTutorial] = useState(false);

  const [allSets, setAllSets] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedCards, setExpandedCards] = useState({});

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
    return <LoginForm onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onShowTutorial={() => setShowTutorial(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 main-content md:px-4 px-3">
        {isLoading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
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

        {activeTab === "analytics" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}> 
            <AnalyticsTab inventory={inventory} />
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

        {activeTab === "sales" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}> 
            <SalesHistoryTab />
          </Suspense>
        )}

        {activeTab === "settings" && !isLoading && (
          <Suspense fallback={<TabLoadingSpinner />}> 
            <SettingsTab inventory={inventory} />
          </Suspense>
        )}
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
  return <MTGInventoryTracker />;
}