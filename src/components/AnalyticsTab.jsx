import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { BarChart3, TrendingUp, Package, DollarSign, History, Filter } from 'lucide-react';

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
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [filterSection, setFilterSection] = useState('all');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [marketRes, metricsRes] = await Promise.all([
          fetch('/api/analytics/market-values'),
          fetch('/api/analytics/card-metrics')
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
  const uniqueCards = inventory.length;
  const avgPricePerCard = uniqueCards > 0 ? (inventory.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / uniqueCards).toFixed(2) : 0;

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

  // Top 5 most valuable cards
  const topCards = [...inventory]
    .sort((a, b) => ((b.quantity || 0) * (parseFloat(b.purchase_price) || 0)) - ((a.quantity || 0) * (parseFloat(a.purchase_price) || 0)))
    .slice(0, 5);

  // Change Log data
  const allFolders = useMemo(() => {
    const folders = new Set(inventory.map(item => item.folder || 'Uncategorized'));
    return Array.from(folders).sort();
  }, [inventory]);

  const changeLog = useMemo(() => {
    return inventory
      .filter(item => item.last_modified)
      .map(item => ({
        id: item.id,
        cardName: item.name,
        folder: item.folder || 'Uncategorized',
        quantity: item.quantity,
        price: item.purchase_price,
        timestamp: new Date(item.last_modified),
        date: new Date(item.last_modified).toLocaleDateString(),
        time: new Date(item.last_modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [inventory]);

  const filteredLog = useMemo(() => {
    return changeLog.filter(entry => {
      if (filterSection === 'all') return true;
      if (filterSection === 'unsorted') return entry.folder === 'Uncategorized';
      return entry.folder === filterSection;
    });
  }, [changeLog, filterSection]);

  const sectionOptions = [
    { value: 'all', label: 'All Sections' },
    { value: 'unsorted', label: 'Unsorted' },
    ...allFolders.map(folder => ({ value: folder, label: `📁 ${folder}` })),
  ];

  return (
    <div className="flex-1 p-6 bg-slate-900 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-teal-300 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics
        </h2>
        <button
          onClick={() => setShowChangeLog(!showChangeLog)}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
            showChangeLog
              ? 'bg-amber-600 text-white shadow-lg'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Change Log View */}
      {showChangeLog ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-600/30 rounded-lg p-4">
            <h3 className="text-xl font-bold text-teal-300 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Changes
            </h3>
            
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-2">Filter by Section</label>
              <select 
                value={filterSection} 
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm hover:border-teal-500 transition-colors"
              >
                {sectionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredLog.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-slate-400 mb-3">
                {filteredLog.length} recent edit{filteredLog.length !== 1 ? 's' : ''}
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLog.map((entry, idx) => (
                  <div 
                    key={`${entry.id}-${idx}`}
                    className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600 rounded-lg p-4 hover:border-teal-500 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-teal-300 text-lg mb-2">{entry.cardName}</div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-slate-500">Folder:</span>
                            <span className="text-slate-300 ml-2">
                              {entry.folder === 'Uncategorized' ? '📂 Unsorted' : `📁 ${entry.folder}`}
                            </span>
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            <div>
                              <span className="text-slate-500">Qty:</span>
                              <span className="text-teal-300 font-semibold ml-2">{entry.quantity}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Price:</span>
                              <span className="text-blue-300 font-semibold ml-2">${parseFloat(entry.price || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:text-right">
                        <div className="text-xs text-slate-500 mb-1">Modified</div>
                        <div className="text-sm font-mono text-amber-400">{entry.date}</div>
                        <div className="text-xs text-slate-400">{entry.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
              <p className="text-slate-400">No edits recorded yet. Start editing cards to see their change history!</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Purchase Value</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Card Metrics Box */}
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Total Cards</div>
                <div className="text-2xl font-bold text-teal-300">{cardMetrics.totalCards}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Available</div>
                <div className="text-2xl font-bold text-blue-300">{totalAvailable}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Unique Cards</div>
                <div className="text-2xl font-bold text-cyan-300">{cardMetrics.uniqueCards}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Sold (60d)</div>
                <div className="text-2xl font-bold text-red-300">{cardMetrics.totalSoldLast60d}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Purchased (60d)</div>
                <div className="text-2xl font-bold text-green-300">{cardMetrics.totalPurchasedLast60d}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Lifetime Total</div>
                <div className="text-2xl font-bold text-amber-300">{cardMetrics.lifetimeTotalCards}</div>
              </div>
            </div>
          </div>

          {/* Value Metrics Box */}
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="space-y-4">
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-1">Current Inventory Value</div>
                <div className="text-2xl font-bold text-blue-300">${totalValue.toFixed(2)}</div>
              </div>
              <div className="border-t border-slate-600 pt-4">
                <div className="text-slate-400 text-xs font-semibold mb-1">Card Kingdom Value</div>
                <div className="text-2xl font-bold text-purple-300">${marketValues.cardkingdom.toFixed(2)}</div>
              </div>
              <div className="border-t border-slate-600 pt-4">
                <div className="text-slate-400 text-xs font-semibold mb-1">TCGPlayer Value</div>
                <div className="text-2xl font-bold text-pink-300">${marketValues.tcgplayer.toFixed(2)}</div>
              </div>
            </div>
          </div>
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
      </div>
        </>
      )}
    </div>
  );
};

AnalyticsTab.propTypes = {
  inventory: PropTypes.array.isRequired,
};
