/**
 * CSV Templates for common MTG inventory service formats
 * @module utils/csvTemplates
 */

/**
 * Moxfield CSV template
 */
export const MOXFIELD_TEMPLATE = `Count,Name,Edition,Condition,Foil,Purchase Price
1,Lightning Bolt,2xm,NM,no,2.50
4,Counterspell,cmr,LP,no,1.00
2,Sol Ring,c21,NM,yes,15.00`;

/**
 * Deckbox CSV template
 */
export const DECKBOX_TEMPLATE = `Count,Name,Edition,Condition,Foil,Language,Price
1,Lightning Bolt,2XM,Near Mint,false,English,2.50
4,Counterspell,CMR,Lightly Played,false,English,1.00
2,Sol Ring,C21,Near Mint,true,English,15.00`;

/**
 * TCGPlayer CSV template
 */
export const TCGPLAYER_TEMPLATE = `Quantity,Card Name,Set Name,Condition,Printing,TCG Marketplace Price
1,Lightning Bolt,Double Masters,Near Mint,Normal,2.50
4,Counterspell,Commander Legends,Lightly Played,Normal,1.00
2,Sol Ring,Commander 2021,Near Mint,Foil,15.00`;

/**
 * Simple Text format template (line by line)
 */
export const SIMPLE_TEXT_TEMPLATE = `4x Lightning Bolt (2XM)
2 Counterspell
1x Sol Ring (C21)
3 Dark Ritual (2XM)`;

/**
 * Archidekt CSV template
 */
export const ARCHIDEKT_TEMPLATE = `Count,Name,Edition,Condition,Foil,Purchase Price,Collector Number
1,Lightning Bolt,2xm,NM,false,2.50,117
4,Counterspell,cmr,LP,false,1.00,60
2,Sol Ring,c21,NM,true,15.00,251`;

/**
 * Get template content by format name
 * @param {string} format - The format name
 * @returns {string} The template content
 */
export const getTemplate = (format) => {
  const templates = {
    moxfield: MOXFIELD_TEMPLATE,
    deckbox: DECKBOX_TEMPLATE,
    tcgplayer: TCGPLAYER_TEMPLATE,
    simple: SIMPLE_TEXT_TEMPLATE,
    archidekt: ARCHIDEKT_TEMPLATE,
  };
  return templates[format.toLowerCase()] || SIMPLE_TEXT_TEMPLATE;
};

/**
 * Get file extension by format
 * @param {string} format - The format name
 * @returns {string} The file extension
 */
export const getFileExtension = (format) => {
  return format.toLowerCase() === 'simple' ? 'txt' : 'csv';
};

/**
 * Download a template file
 * @param {string} format - The format name
 */
export const downloadTemplate = (format) => {
  const content = getTemplate(format);
  const extension = getFileExtension(format);
  const filename = `${format.toLowerCase()}_template.${extension}`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  try {
    // Click link without appending to DOM (works in modern browsers)
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * All supported formats with their display names
 */
export const SUPPORTED_FORMATS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'moxfield', label: 'Moxfield' },
  { value: 'deckbox', label: 'Deckbox' },
  { value: 'tcgplayer', label: 'TCGPlayer' },
  { value: 'archidekt', label: 'Archidekt' },
  { value: 'simple', label: 'Simple Text' },
];
