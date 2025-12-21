import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Filter,
  Activity,
  Shield,
  Bell,
  Library,
  ShoppingCart,
  Fingerprint,
  History,
  Store,
  Clock,
  CheckCircle,
  Truck,
  Inbox,
  Tag,
  ShoppingBag,
  Receipt
} from 'lucide-react';
import { ChangeLogTab } from './ChangeLogTab';
import { ActivityFeed } from './ActivityFeed';
import { AuditLog } from './AuditLog';
import { AlertSettings } from './settings/AlertSettings';
import { fetchWithAuth } from '../utils/apiClient';
import { StatsCard, TrendChart } from './ui';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';

// Sub-tab definitions
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales History', icon: Receipt },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'activity', label: 'Activity', icon: Activity },
];

/**
 * Sales History Section Component
 */
function SalesSection() {
  const { get } = useApi();
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSalesHistory();
  }, []);

  const loadSalesHistory = async () => {
    try {
      const data = await get(API_ENDPOINTS.SALES);
      setSales((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.sell_price * (sale.quantity || 1)), 0);
  const totalCOGS = sales.reduce((sum, sale) => sum + (sale.purchase_price * (sale.quantity || 1)), 0);
  const totalGrossProfit = totalRevenue - totalCOGS;
  const profitMargin = totalCOGS > 0 ? ((totalGrossProfit / totalCOGS) * 100) : 0;

  if (isLoading) {
    return <div className="text-[var(--bda-muted)] text-center py-8">Loading sales history...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Transactions"
          value={sales.length.toString()}
          icon={Receipt}
          color="cyan"
        />
        <StatsCard
          title="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="blue"
        />
        <StatsCard
          title="COGS"
          value={`$${totalCOGS.toFixed(2)}`}
          icon={ShoppingCart}
          color="orange"
        />
        <StatsCard
          title="Gross Profit"
          value={`$${totalGrossProfit.toFixed(2)}`}
          icon={TrendingUp}
          color={totalGrossProfit >= 0 ? 'emerald' : 'red'}
        />
        <StatsCard
          title="Markup %"
          value={`${profitMargin.toFixed(1)}%`}
          icon={BarChart3}
          color={profitMargin >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Sales List */}
      {sales.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-[var(--bda-muted)]" />
          </div>
          <p className="text-[var(--bda-muted)] text-lg">No sales recorded yet.</p>
          <p className="text-sm text-[var(--bda-muted)] opacity-70">Start selling items to track profits!</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)]/50 border-b border-[var(--glass-border)]">
                  <th className="px-4 py-3 text-left text-[var(--bda-text)] font-semibold">Item</th>
                  <th className="px-4 py-3 text-left text-[var(--bda-text)] font-semibold">Type</th>
                  <th className="px-4 py-3 text-right text-[var(--bda-text)] font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right text-[var(--bda-text)] font-semibold">COGS</th>
                  <th className="px-4 py-3 text-right text-[var(--bda-text)] font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-right text-[var(--bda-text)] font-semibold">Profit</th>
                  <th className="px-4 py-3 text-right text-[var(--bda-text)] font-semibold">Margin</th>
                  <th className="px-4 py-3 text-left text-[var(--bda-text)] font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const qty = sale.quantity || 1;
                  const cogs = sale.purchase_price * qty;
                  const revenue = sale.sell_price * qty;
                  const grossProfit = revenue - cogs;
                  const markup = cogs > 0 ? ((grossProfit / cogs) * 100) : 0;

                  return (
                    <tr key={sale.id} className="border-b border-[var(--bda-border)] hover:bg-[var(--bda-surface)]/50 transition-colors">
                      <td className="px-4 py-3 text-[var(--bda-text)] font-medium">{sale.item_name}</td>
                      <td className="px-4 py-3 text-[var(--bda-muted)]">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${sale.item_type === 'deck'
                          ? 'bg-[var(--bda-primary)]/30 text-[var(--bda-primary)]'
                          : 'bg-blue-600/30 text-blue-300'
                          }`}>
                          {sale.item_type === 'deck' ? 'Deck' : 'Card'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--bda-text)]">{qty}</td>
                      <td className="px-4 py-3 text-right text-orange-300 font-medium">${cogs.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-blue-300 font-medium">${revenue.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        ${grossProfit.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${markup >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {markup.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-[var(--bda-muted)] text-xs">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * eBay Sales Widget Component
 */
function EbaySalesWidget() {
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEbayStats = async () => {
      try {
        const [statsRes, listingsRes] = await Promise.all([
          fetchWithAuth('/api/ebay/analytics'),
          fetchWithAuth('/api/ebay/listings?limit=5')
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (listingsRes.ok) {
          const listingsData = await listingsRes.json();
          setRecentListings(listingsData.slice(0, 5));
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch eBay stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEbayStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
        <div className="text-[var(--bda-muted)] text-center py-4">Loading eBay stats...</div>
      </div>
    );
  }

  const statusIcons = {
    draft: Clock,
    active: Store,
    sold: Package,
    shipped: Truck,
    completed: CheckCircle,
  };

  const statusColors = {
    draft: 'text-gray-400',
    active: 'text-blue-400',
    sold: 'text-yellow-400',
    shipped: 'text-purple-400',
    completed: 'text-green-400',
  };

  return (
    <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
      <h3 className="text-lg font-semibold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
        <Store className="w-4 h-4 text-[var(--bda-primary)]" />
        eBay Sales
      </h3>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[var(--input-bg)] rounded p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.activeListings || 0}</div>
            <div className="text-xs text-[var(--bda-muted)]">Active</div>
          </div>
          <div className="bg-[var(--input-bg)] rounded p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pendingOrders || 0}</div>
            <div className="text-xs text-[var(--bda-muted)]">Pending</div>
          </div>
          <div className="bg-[var(--input-bg)] rounded p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.completedSales || 0}</div>
            <div className="text-xs text-[var(--bda-muted)]">Completed</div>
          </div>
          <div className="bg-[var(--input-bg)] rounded p-3 text-center">
            <div className="text-2xl font-bold text-[var(--bda-primary)]">${(stats.totalRevenue || 0).toFixed(0)}</div>
            <div className="text-xs text-[var(--bda-muted)]">Revenue</div>
          </div>
        </div>
      )}

      {recentListings.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[var(--bda-muted)] mb-2">Recent Listings</div>
          {recentListings.map((listing) => {
            const StatusIcon = statusIcons[listing.status] || Clock;
            return (
              <div key={listing.id} className="flex items-center justify-between p-2 bg-[var(--input-bg)] rounded text-sm">
                <div className="flex items-center gap-2 truncate flex-1">
                  <StatusIcon size={14} className={statusColors[listing.status]} />
                  <span className="truncate">{listing.title || listing.deck_name || 'Untitled'}</span>
                </div>
                <div className="text-[var(--bda-muted)] ml-2">${parseFloat(listing.price || 0).toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-[var(--bda-muted)] text-sm py-4">
          No eBay listings yet. Create one from the Decks tab!
        </div>
      )}
    </div>
  );
}

/**
 * Overview/Analytics Section Component
 */
function OverviewSection({ inventory }) {
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
    uniqueCards: 0,
    totalSoldLast60d: 0,
    totalPurchasedLast60d: 0,
    lifetimeTotalCards: 0,
    lifetimeTotalValue: 0
  });

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
      } catch (error) { }
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

  // Top 5 most valuable cards
  const topCards = [...inventory]
    .sort((a, b) => ((b.quantity || 0) * (parseFloat(b.purchase_price) || 0)) - ((a.quantity || 0) * (parseFloat(a.purchase_price) || 0)))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics - Card Stats */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Inventory Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard
            title="Total Cards"
            value={formatNumber((cardMetrics && cardMetrics.totalCards) ?? 0)}
            icon={Library}
            color="primary"
          />
          <StatsCard
            title="Available"
            value={formatNumber(totalAvailable ?? 0)}
            icon={Inbox}
            color="blue"
          />
          <StatsCard
            title="Unique Cards"
            value={formatNumber((cardMetrics && cardMetrics.uniqueCards) ?? 0)}
            icon={Fingerprint}
            color="slate"
          />
          <StatsCard
            title="Sold (60d)"
            value={formatNumber((cardMetrics && cardMetrics.totalSoldLast60d) ?? 0)}
            icon={Tag}
            color="red"
          />
          <StatsCard
            title="Purchased (60d)"
            value={formatNumber((cardMetrics && cardMetrics.totalPurchasedLast60d) ?? 0)}
            icon={ShoppingBag}
            color="emerald"
          />
          <StatsCard
            title="Lifetime Sold"
            value={formatNumber((cardMetrics && cardMetrics.lifetimeTotalCards) ?? 0)}
            icon={History}
            color="amber"
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
        <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--bda-primary)]" />
            By Folder
          </h3>
          <div className="space-y-2">
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
        <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--bda-primary)]" />
            Top 5 Valuable
          </h3>
          <div className="space-y-2">
            {topCards.map((card, idx) => (
              <div key={card.id} className="flex justify-between items-center text-sm p-2 bg-[var(--input-bg)] rounded">
                <span className="text-[var(--bda-muted)]">{idx + 1}. {card.name}</span>
                <div className="text-[var(--bda-text)] font-semibold">${((card.quantity || 0) * (parseFloat(card.purchase_price) || 0)).toFixed(2)}</div>
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
              color="primary"
              height={180}
            />
          </div>
        )}
      </div>

      {/* eBay Sales Widget */}
      <EbaySalesWidget />
    </div>
  );
}

OverviewSection.propTypes = {
  inventory: PropTypes.array.isRequired,
};

/**
 * Main Dashboard Tab Component - combines Analytics and Sales
 */
export const DashboardTab = ({ inventory }) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');

  return (
    <div className="flex-1 p-0 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-heading font-bold text-gradient flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-[var(--bda-primary)]" />
          Dashboard
        </h2>
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-[var(--bda-surface)] rounded-lg p-1 flex gap-1 mb-6">
        {DASHBOARD_TABS.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 ${activeSubTab === tab.id
                ? 'bg-[var(--bda-surface)] text-[var(--bda-primary)] shadow-sm'
                : 'text-[var(--bda-muted)] hover:text-[var(--bda-text)] hover:bg-white/5'
                }`}
            >
              <IconComponent className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'overview' && <OverviewSection inventory={inventory} />}
      {activeSubTab === 'sales' && <SalesSection />}
      {activeSubTab === 'alerts' && (
        <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
          <h3 className="text-xl font-bold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alerts & Notifications
          </h3>
          <AlertSettings inventory={inventory} />
        </div>
      )}
      {activeSubTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
            <h3 className="text-xl font-bold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h3>
            <ActivityFeed />
          </div>
          <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
            <h3 className="text-xl font-bold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Audit Log
            </h3>
            <AuditLog />
          </div>
          <div className="bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-lg p-4">
            <h3 className="text-xl font-bold text-[var(--bda-heading)] mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Change History
            </h3>
            <ChangeLogTab />
          </div>
        </div>
      )}
    </div>
  );
};

DashboardTab.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default DashboardTab;
