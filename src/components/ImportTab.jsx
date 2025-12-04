import React, { useState } from 'react';
import { Layers, Upload } from 'lucide-react';
import { RapidEntryTable } from './rapid-entry/RapidEntryTable';
import { FileImportSection } from './FileImportSection';

export const ImportTab = ({ 
  allSets,
  searchResults,
  showDropdown,
  setShowDropdown,
  handleSearch,
  searchIsLoading,
  addInventoryItem,
}) => {
  const [createdFolders, setCreatedFolders] = useState([]);

  // Load folders from localStorage
  React.useEffect(() => {
    const savedFolders = localStorage.getItem('createdFolders');
    if (savedFolders) setCreatedFolders(JSON.parse(savedFolders));
  }, []);

  // Handler for adding card from rapid entry
  const handleRapidAddCard = async (cardData) => {
    const item = {
      name: cardData.name,
      set: cardData.set,
      set_name: cardData.set_name,
      quantity: cardData.quantity,
      purchase_price: cardData.purchase_price,
      folder: cardData.folder || 'Unsorted',
      image_url: cardData.image_url,
      foil: cardData.foil || false,
      quality: cardData.quality || 'NM',
    };

    return await addInventoryItem(item);
  };

  return (
    <div className="space-y-6">
      {/* Rapid Entry Section */}
      <div className="card rounded-lg p-4 sm:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-6 h-6 text-teal-400" />
          <h2 className="text-lg sm:text-xl font-bold">Rapid Card Entry</h2>
        </div>
        <RapidEntryTable
          onAddCard={handleRapidAddCard}
          allSets={allSets}
          createdFolders={createdFolders}
          handleSearch={handleSearch}
          searchResults={searchResults}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          searchIsLoading={searchIsLoading}
        />
      </div>

      {/* Bulk File Import Section */}
      <div className="card rounded-lg p-4 sm:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-6 h-6 text-cyan-400" />
          <h2 className="text-lg sm:text-xl font-bold">Bulk Import from File</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Import cards from CSV or text files. Supports Moxfield, Deckbox, TCGPlayer, Archidekt, Manabox, and simple text formats.
        </p>
        <FileImportSection
          addInventoryItem={addInventoryItem}
          createdFolders={createdFolders}
        />
      </div>
    </div>
  );
};

export default ImportTab;
