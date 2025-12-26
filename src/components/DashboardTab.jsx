import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Library,
  Fingerprint,
  Inbox,
  Download,
  ArrowRight
} from 'lucide-react';
import { fetchWithAuth } from '../utils/apiClient';
import { StatsCard, TrendChart } from './ui';

/**
 * Overview/Analytics Section Component
 */
/**
 * Overview/Analytics Section Component
 */
function OverviewSection({ inventory, onNavigate }) {
  const formatNumber = (v) => {
    if (v === null || v === undefined) return '—';
    try {
      return Number(v).toLocaleString();
    } catch (e) {
      return String(v);
    }
  };

  const [marketValues, setMarketValues] = useState({ cardkingdom: 0, tcgplayer: 0 });
  const [cardMetrics, setCardMetrics] = useState({
    totalCards: 0,
    totalAvailable: 0,
    uniqueCards: 0
  });
  const [topCards, setTopCards] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [marketRes, metricsRes, topCardsRes] = await Promise.all([
          fetchWithAuth('/api/analytics/market-values'),
          fetchWithAuth('/api/analytics/card-metrics'),
          fetchWithAuth('/api/analytics/top-cards')
        ]);

        // Check if responses are ok before parsing
        if (marketRes.ok) {
          const marketData = await marketRes.json();
          setMarketValues(marketData || { cardkingdom: 0, tcgplayer: 0 });
        }

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setCardMetrics(metricsData || {
            totalCards: 0,
            totalAvailable: 0,
            uniqueCards: 0
          });
        }

        if (topCardsRes.ok) {
          const topCardsData = await topCardsRes.json();
          setTopCards(Array.isArray(topCardsData) ? topCardsData : []);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch analytics:', error);
      }
    };
    fetchAnalytics();
  }, []);

  // Calculate analytics
  const totalAvailable = inventory.reduce((sum, item) => {
    const qty = item.quantity || 0;
    const reserved = parseInt(item.reserved_quantity) || 0;
    return sum + Math.max(0, qty - reserved);
  }, 0);
  const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (parseFloat(item.purchase_price) || 0)), 0);

  // Group by folder
  const byFolder = inventory.reduce((acc, item) => {
    const folder = item.folder || 'Uncategorized';
    if (!acc[folder]) acc[folder] = { count: 0, value: 0 };
    acc[folder].count += item.quantity || 0;
    acc[folder].value += (item.quantity || 0) * (parseFloat(item.purchase_price) || 0);
    return acc;
  }, {});

  // Group by set
  const bySet = inventory.reduce((acc, item) => {
    const set = item.set || 'Unknown';
    if (!acc[set]) acc[set] = { count: 0, value: 0 };
    acc[set].count += item.quantity || 0;
    acc[set].value += (item.quantity || 0) * (parseFloat(item.purchase_price) || 0);
    return acc;
  }, {});

  const bySetData = Object.entries(bySet)
    .map(([set, d]) => ({ label: set, value: d.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Top cards are now fetched from API

  return (
    <div className="space-y-8 animate-fade-in">
      {inventory.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-xl animate-fade-in border-2 border-dashed border-[var(--bda-border)]">
          <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)]/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-purple-500/10 ring-1 ring-[var(--primary)]/30">
            <Library className="w-10 h-10 text-[var(--bda-primary)]" />
          </div>
          <h3 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Welcome to BigDeck!</h3>
          <p className="text-[var(--bda-muted)] max-w-md mb-8 text-lg">
            Your inventory is currently empty. Start by importing cards or adding them manually to see your analytics.
          </p>
          <button
            onClick={() => onNavigate('imports')}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Add Your First Cards
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {inventory.length > 0 && (
        <div className="space-y-6">
          {/* Key Metrics - Card Stats */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Inventory Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatsCard
                title="Total Cards"
                value={formatNumber((cardMetrics && cardMetrics.totalCards) ?? 0)}
                icon={Library}
                color="purple"
                size="sm"
              />
              <StatsCard
                title="Available"
                value={formatNumber(totalAvailable ?? 0)}
                icon={Inbox}
                color="blue"
                size="sm"
              />
              <StatsCard
                title="Unique Cards"
                value={formatNumber((cardMetrics && cardMetrics.uniqueCards) ?? 0)}
                icon={Fingerprint}
                color="slate"
                size="sm"
              />
            </div>

            {/* Value Metrics */}
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Collection Value</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Purchase Value"
                value={`$${totalValue.toFixed(2)}`}
                icon={DollarSign}
                color="blue"
                subtitle="Based on purchase prices"
              />
              <StatsCard
                title="Card Kingdom"
                value={`$${(marketValues?.cardkingdom ?? 0).toFixed(2)}`}
                icon={DollarSign}
                color="purple"
                subtitle="Current market value"
              />
              <StatsCard
                title="TCGPlayer"
                value={`$${(marketValues?.tcgplayer ?? 0).toFixed(2)}`}
                icon={DollarSign}
                color="amber"
                subtitle="Current market value"
              />
            </div>
          </div>

          {/* Cards by Folder and Top Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--bda-primary)]" />
                By Folder
              </h3>
              <div className="space-y-2 flex-1">
                {Object.entries(byFolder).map(([folder, data]) => (
                  <div key={folder} className="flex justify-between items-center text-sm p-2 bg-[var(--input-bg)] rounded">
                    <span className="text-[var(--bda-muted)]">{folder}</span>
                    <div className="flex gap-3">
                      <span className="text-[var(--bda-primary)] font-semibold">{data.count} cards</span>
                      <span className="text-[var(--bda-text)]">${data.value.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Cards */}
            <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--bda-primary)]" />
                Top 5 Valuable
              </h3>
              <div className="space-y-2 flex-1">
                {topCards.map((card, idx) => (
                  <div key={card.id} className="flex justify-between items-center text-sm p-2 bg-[var(--input-bg)] rounded">
                    <span className="text-[var(--bda-muted)]">{idx + 1}. {card.name}</span>
                    <div className="text-[var(--bda-text)] font-semibold" title={`$${(parseFloat(card.unitPrice) || 0).toFixed(2)}/unit (${card.priceSource || 'unknown'})`}>${(parseFloat(card.value) || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Value by Set */}
          <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
            <h3 className="text-lg font-semibold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--bda-primary)]" />
              Value by Set
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(bySet)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([set, data]) => (
                  <div key={set} className="p-2 bg-[var(--input-bg)] rounded text-sm">
                    <div className="font-semibold text-[var(--bda-heading)]">{set}</div>
                    <div className="text-xs text-[var(--bda-muted)]">{data.count} cards • ${data.value.toFixed(2)}</div>
                  </div>
                ))}
            </div>
            {/* Trend chart for top sets */}
            {bySetData.length > 0 && (
              <div className="mt-4">
                <TrendChart
                  data={bySetData}
                  dataKey="value"
                  labelKey="label"
                  title="Top Sets by Value"
                  subtitle="Top 10 sets by purchase value"
                  format="currency"
                  color="purple"
                  height={180}
                />
              </div>
            )}
          </div>

          {/* eBay Sales Widget - Removed (eBay integration deprecated) */}
        </div>
      )}
    </div>
  );
}

OverviewSection.propTypes = {
  inventory: PropTypes.array.isRequired,
};

/**
 * Main Dashboard Tab Component - Overview of collection analytics
 */
export const DashboardTab = ({ inventory, setActiveTab }) => {
  return (
    <div className="flex-1 p-0 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-heading font-bold text-gradient flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-[var(--bda-primary)]" />
          Dashboard
        </h2>
      </div>

      {/* Main Content */}
      <OverviewSection inventory={inventory} onNavigate={setActiveTab} />
    </div>
  );
};

DashboardTab.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default DashboardTab;
