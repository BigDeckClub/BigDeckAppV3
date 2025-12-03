import React, { useState, useMemo } from 'react';
import { Filter, Folder, FolderOpen } from 'lucide-react';
import PropTypes from 'prop-types';

export const ChangeLogTab = ({ inventory = [] }) => {
  const [filterSection, setFilterSection] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  // Get all folders from inventory
  const allFolders = useMemo(() => {
    const folders = new Set(inventory.map(item => item.folder || 'Uncategorized'));
    return Array.from(folders).sort();
  }, [inventory]);

  // Build change log from inventory last_modified timestamps
  const changeLog = useMemo(() => {
    return inventory
      .filter(item => item.last_modified) // Only show items with modification history
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

  // Filter changes
  const filteredLog = useMemo(() => {
    return changeLog.filter(entry => {
      if (filterSection === 'all') return true;
      if (filterSection === 'unsorted') return entry.folder === 'Uncategorized';
      return entry.folder === filterSection;
    });
  }, [changeLog, filterSection]);

  // Get section options
  const sectionOptions = [
    { value: 'all', label: 'All Sections' },
    { value: 'unsorted', label: 'Unsorted' },
    ...allFolders.map(folder => ({ value: folder, label: folder })),
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-6 px-4 md:px-6">
      <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-600/30 rounded-lg p-4">
        <h2 className="text-xl font-bold text-teal-300 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Change Log
        </h2>
        
        <div className="flex flex-col md:flex-row gap-3">
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
      </div>

      {/* Change Log Table */}
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
                        <span className="text-slate-300 ml-2 inline-flex items-center gap-1">
                          {entry.folder === 'Uncategorized' 
                            ? <><FolderOpen className="w-3 h-3" /> Unsorted</>
                            : <><Folder className="w-3 h-3" /> {entry.folder}</>
                          }
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
  );
};

ChangeLogTab.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    folder: PropTypes.string,
    quantity: PropTypes.number,
    purchase_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    last_modified: PropTypes.string,
  })),
};

export default ChangeLogTab;
