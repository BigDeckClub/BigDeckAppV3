import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { X, Folder } from 'lucide-react';
import { SortControls } from './SortControls';
import { ViewModeToggle, VIEW_MODES } from '../ui';

/**
 * InventoryTabs - Tab navigation for inventory views
 * Includes All Cards, folder tabs, deck tabs, and view mode toggle
 */
export const InventoryTabs = memo(function InventoryTabs({
  activeTab,
  setActiveTab,
  openFolders,
  setOpenFolders,
  openDecks,
  deckInstances,
  closeDeckTab,
  viewMode,
  setViewMode,
  setSidebarOpen,
  draggedTabData,
  setDraggedTabData,
  reorderTabs,
  sortField = 'name',
  sortDirection = 'asc',
  onSortChange,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8 border-b border-slate-700 pb-4 items-start md:items-center justify-between">
      <div className="flex gap-1 w-full md:w-auto overflow-x-auto flex-wrap bg-slate-800/50 rounded-lg p-1 md:p-1.5 border border-slate-700">
        <button
          onClick={() => { setActiveTab('all'); setSidebarOpen(false); }}
          className={`px-4 py-2 text-sm md:text-base font-medium transition-all duration-300 whitespace-nowrap rounded-lg ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-500/30'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30'
          }`}
        >
          All Cards
        </button>
        
        {/* Folder Tabs */}
        {openFolders.map((folderName, index) => (
          <div 
            key={`folder-tab-${folderName}`}
            className="flex items-center group"
            draggable
            onDragStart={(e) => {
              setDraggedTabData({type: 'folder', index});
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedTabData?.type === 'folder') {
                e.currentTarget.classList.add('opacity-50');
              }
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('opacity-50');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('opacity-50');
              if (draggedTabData?.type === 'folder') {
                reorderTabs('folder', draggedTabData.index, index);
                setDraggedTabData(null);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab(folderName)}
              className={`px-4 py-2 text-sm md:text-base font-medium transition-all duration-300 whitespace-nowrap cursor-grab active:cursor-grabbing rounded-lg ${
                activeTab === folderName
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30'
              }`}
            >
              <Folder className="w-4 h-4 mr-1" />
              {folderName === 'Uncategorized' ? 'Unsorted' : folderName}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const remaining = openFolders.filter(f => f !== folderName);
                setOpenFolders(remaining);
                if (activeTab === folderName) {
                  setActiveTab('all');
                }
              }}
              className="ml-1 close-btn fade-in-btn"
              title="Close folder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Deck Tabs */}
        {openDecks.map((deckId, index) => {
          const deck = deckInstances.find(d => d.id === deckId);
          if (!deck) return null;
          return (
            <div 
              key={`deck-tab-${deckId}`} 
              className="flex items-center"
              draggable
              onDragStart={(e) => {
                setDraggedTabData({type: 'deck', index});
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedTabData?.type === 'deck') {
                  e.currentTarget.classList.add('opacity-50');
                }
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('opacity-50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('opacity-50');
                if (draggedTabData?.type === 'deck') {
                  reorderTabs('deck', draggedTabData.index, index);
                  setDraggedTabData(null);
                }
              }}
            >
              <button
                onClick={() => setActiveTab(`deck-${deckId}`)}
                className={`px-4 py-2 text-sm md:text-base font-medium transition-all duration-300 whitespace-nowrap cursor-grab active:cursor-grabbing rounded-lg ${
                  activeTab === `deck-${deckId}`
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30'
                }`}
              >
                {deck.name}
              </button>
              <button
                onClick={() => closeDeckTab(deckId)}
                className="ml-1 close-btn"
                title="Close deck"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Sort and View Controls */}
      <div className="flex gap-2 items-center">
        {/* Sort Controls */}
        {onSortChange && (
          <SortControls
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        )}

        {/* View Mode Toggle */}
        <ViewModeToggle
          activeMode={
            viewMode === 'card' ? VIEW_MODES.GALLERY :
            viewMode === 'image' ? VIEW_MODES.GALLERY :
            viewMode === 'list' ? VIEW_MODES.LIST :
            viewMode === 'table' ? VIEW_MODES.TABLE :
            VIEW_MODES.GALLERY
          }
          onChange={(mode) => setViewMode(mode === VIEW_MODES.GALLERY ? 'card' : mode)}
        />
      </div>
    </div>
  );
});

InventoryTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  openFolders: PropTypes.array.isRequired,
  setOpenFolders: PropTypes.func.isRequired,
  openDecks: PropTypes.array.isRequired,
  deckInstances: PropTypes.array.isRequired,
  closeDeckTab: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  setViewMode: PropTypes.func.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  draggedTabData: PropTypes.object,
  setDraggedTabData: PropTypes.func.isRequired,
  reorderTabs: PropTypes.func.isRequired,
  sortField: PropTypes.oneOf(['name', 'price', 'quantity', 'set', 'dateAdded']),
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  onSortChange: PropTypes.func
};

export default InventoryTabs;
