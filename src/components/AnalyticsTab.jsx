import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BarChart3, TrendingUp, Package, DollarSign, Filter, Activity, Shield, Bell, Layers, ShoppingCart, CreditCard } from 'lucide-react';
import { ChangeLogTab } from './ChangeLogTab';
import { ActivityFeed } from './ActivityFeed';
import { AuditLog } from './AuditLog';
import { AlertSettings } from './settings/AlertSettings';
import { fetchWithAuth } from '../utils/apiClient';
import { StatsCard, TrendChart } from './ui';

export const AnalyticsTab = ({ inventory }) => {
  const [marketValues, setMarketValues] = useState({ cardkingdom: 0, tcgplayer: 0 });
  const [cardMetrics, setCardMetrics] = useState({
    totalCards: 0,
    totalAvailable: 0,
    uniqueCards: 0,
    totalSoldLast60d: 0,
    totalPurchasedLast60d: 0,
    lifetimeTotalCards: 0,
    lifetimeTotalValue: 0
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState('alerts');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [marketRes, metricsRes] = await Promise.all([
          fetchWithAuth('/api/analytics/market-values'),
          fetchWithAuth('/api/analytics/card-metrics')
        ]);
        const marketData = await marketRes.json();
        const metricsData = await metricsRes.json();
        setMarketValues(marketData || { cardkingdom: 0, tcgplayer: 0 });
        setCardMetrics(metricsData || {
          totalCards: 0,
          totalAvailable: 0,
          uniqueCards: 0,
          totalSoldLast60d: 0,
          totalPurchasedLast60d: 0,
          lifetimeTotalCards: 0,
          lifetimeTotalValue: 0
        });
      } catch (error) {}
    };
    fetchAnalytics();
  }, []);

  // Calculate analytics
  const totalCards = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
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

  // Top 5 most valuable cards
  const topCards = [...inventory]
    .sort((a, b) => ((b.quantity || 0) * (parseFloat(b.purchase_price) || 0)) - ((a.quantity || 0) * (parseFloat(a.purchase_price) || 0)))
    .slice(0, 5);

  // History sub-tabs configuration
  const historyTabs = [
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'changes', label: 'Change History', icon: Filter },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'audit', label: 'Audit Log', icon: Shield }
  ];

  return (
    <div className="flex-1 p-6 bg-slate-900 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-teal-300 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics
        </h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
            showHistory
              ? 'bg-amber-600 text-white shadow-lg'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alerts & History
        </button>
      </div>

      {/* History View with Sub-tabs */}
      {showHistory ? (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="bg-slate-800/50 rounded-lg p-1 flex gap-1">
            {historyTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id)}
                  className={`flex-1 px-4 py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    historyTab === tab.id
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-tab Content */}
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-600/30 rounded-lg p-4">
            <h3 className="text-xl font-bold text-teal-300 mb-4 flex items-center gap-2">
              {historyTabs.find(t => t.id === historyTab)?.icon && 
                React.createElement(historyTabs.find(t => t.id === historyTab).icon, { className: "w-5 h-5" })}
              {historyTabs.find(t => t.id === historyTab)?.label}
            </h3>
            
            {historyTab === 'alerts' && <AlertSettings inventory={inventory} />}
            {historyTab === 'changes' && <ChangeLogTab />}
            {historyTab === 'activity' && <ActivityFeed />}
            {historyTab === 'audit' && <AuditLog />}
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics - Card Stats */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Inventory Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <StatsCard
                title="Total Cards"
                value={cardMetrics.totalCards.toLocaleString()}
                icon={Layers}
                color="teal"
              />
              <StatsCard
                title="Available"
                value={totalAvailable.toLocaleString()}
                icon={Package}
                color="blue"
              />
              <StatsCard
                title="Unique Cards"
                value={cardMetrics.uniqueCards.toLocaleString()}
                icon={CreditCard}
                color="slate"
              />
              <StatsCard
                title="Sold (60d)"
                value={cardMetrics.totalSoldLast60d.toLocaleString()}
                icon={ShoppingCart}
                color="red"
              />
              <StatsCard
                title="Purchased (60d)"
                value={cardMetrics.totalPurchasedLast60d.toLocaleString()}
                icon={TrendingUp}
                color="emerald"
              />
              <StatsCard
                title="Lifetime Sold"
                value={cardMetrics.lifetimeTotalCards.toLocaleString()}
                icon={BarChart3}
                color="amber"
              />
            </div>

            {/* Value Metrics */}
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Collection Value</h3>
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
                value={`$${marketValues.cardkingdom.toFixed(2)}`}
                icon={DollarSign}
                color="purple"
                subtitle="Current market value"
              />
              <StatsCard
                title="TCGPlayer"
                value={`$${marketValues.tcgplayer.toFixed(2)}`}
                icon={DollarSign}
                color="amber"
                subtitle="Current market value"
              />
            </div>
          </div>

      {/* Cards by Folder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-300" />
            By Folder
          </h3>
          <div className="space-y-2">
            {Object.entries(byFolder).map(([folder, data]) => (
              <div key={folder} className="flex justify-between items-center text-sm p-2 bg-slate-700/30 rounded">
                <span className="text-slate-300">{folder}</span>
                <div className="flex gap-3">
                  <span className="text-teal-300 font-semibold">{data.count} cards</span>
                  <span className="text-amber-300">${data.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cards */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-300" />
            Top 5 Valuable
          </h3>
          <div className="space-y-2">
            {topCards.map((card, idx) => (
              <div key={card.id} className="flex justify-between items-center text-sm p-2 bg-slate-700/30 rounded">
                <span className="text-slate-300">{idx + 1}. {card.name}</span>
                <div className="text-amber-300 font-semibold">${((card.quantity || 0) * (parseFloat(card.purchase_price) || 0)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Value by Set */}
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-300" />
          Value by Set
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(bySet)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([set, data]) => (
              <div key={set} className="p-2 bg-slate-700/30 rounded text-sm">
                <div className="font-semibold text-slate-100">{set}</div>
                <div className="text-xs text-slate-400">{data.count} cards • ${data.value.toFixed(2)}</div>
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
              color="teal"
              height={180}
            />
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

AnalyticsTab.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default AnalyticsTab;
