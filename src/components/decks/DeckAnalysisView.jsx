import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { BarChart3, AlertCircle, CheckCircle2, List } from 'lucide-react';
import { EXTERNAL_APIS } from '../../config/api';
import { BuyCardsModal } from '../buy/BuyCardsModal';
import { useDeckAnalysis } from '../../hooks/useDeckAnalysis';
import {
  DeckQuantitySelector,
  DeckAnalysisStats,
  OverviewSummary,
  MissingCardsView,
  SharedCardsView,
  BreakdownView
} from './DeckAnalysisView/index';

/**
 * DeckAnalysisView - Advanced multi-deck analysis and comparison
 * Shows shared cards, missing cards, bulk calculations with deck quantity sliders
 *
 * Refactored to use sub-components for better maintainability
 */
export function DeckAnalysisView({ decks, selectedDeckIds, inventoryByName }) {
  // Use the analysis hook for all calculation logic
  const {
    selectedDecks,
    deckQuantities,
    analysis,
    missingCardsForBuy,
    handleQuantityChange,
    exportToCSV
  } = useDeckAnalysis({ decks, selectedDeckIds, inventoryByName });

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
    quantities: true,
    stats: true
  });
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Toggle section expansion
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Get card image URL
  const getCardImageUrl = useCallback((cardName) => {
    const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
    return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&format=image&version=normal`;
  }, []);

  if (selectedDeckIds.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-ui-muted mx-auto mb-4" />
        <p className="text-ui-muted">Select at least one deck to see analysis</p>
      </div>
    );
  }

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'missing', label: `Missing (${analysis.missingCards.length})`, icon: AlertCircle },
    { id: 'shared', label: `Shared (${analysis.sharedCards.length})`, icon: CheckCircle2 },
    { id: 'breakdown', label: 'Full Breakdown', icon: List }
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-ui-card rounded-lg border border-ui-border p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-ui-primary text-ui-primary-foreground shadow-lg'
                  : 'bg-ui-surface text-ui-muted hover:bg-ui-surface/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <OverviewSummary
            analysis={analysis}
            selectedDecksCount={selectedDecks.length}
            onViewMissing={() => setActiveTab('missing')}
            onViewShared={() => setActiveTab('shared')}
          />

          <DeckQuantitySelector
            selectedDecks={selectedDecks}
            deckQuantities={deckQuantities}
            onQuantityChange={handleQuantityChange}
            isExpanded={expandedSections.quantities}
            onToggle={() => toggleSection('quantities')}
          />

          <DeckAnalysisStats
            deckStats={analysis.deckStats}
            isExpanded={expandedSections.stats}
            onToggle={() => toggleSection('stats')}
          />
        </>
      )}

      {/* Missing Cards Tab */}
      {activeTab === 'missing' && (
        <MissingCardsView
          missingCards={analysis.missingCards}
          estimatedCost={analysis.estimatedCost}
          onExportCSV={exportToCSV}
          onOpenBuyModal={() => setShowBuyModal(true)}
          getCardImageUrl={getCardImageUrl}
        />
      )}

      {/* Shared Cards Tab */}
      {activeTab === 'shared' && (
        <SharedCardsView
          sharedCards={analysis.sharedCards}
          getCardImageUrl={getCardImageUrl}
        />
      )}

      {/* Full Breakdown Tab */}
      {activeTab === 'breakdown' && (
        <BreakdownView
          cardRequirements={analysis.cardRequirements}
          getCardImageUrl={getCardImageUrl}
        />
      )}

      {/* Buy Missing Cards Modal */}
      <BuyCardsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        cards={missingCardsForBuy}
        deckName={selectedDecks.length === 1 ? selectedDecks[0]?.name : 'Selected Decks'}
      />
    </div>
  );
}

DeckAnalysisView.propTypes = {
  decks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      quantity: PropTypes.number,
      set: PropTypes.string,
      price: PropTypes.number
    }))
  })).isRequired,
  selectedDeckIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  inventoryByName: PropTypes.object
};

export default DeckAnalysisView;
