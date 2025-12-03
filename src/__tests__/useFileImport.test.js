import { describe, it, expect } from 'vitest';
import { 
  parseCSVLine, 
  parseSimpleText, 
  detectFormat, 
  parseCSV 
} from '../hooks/useFileImport';

describe('parseCSVLine', () => {
  it('parses simple CSV line', () => {
    const result = parseCSVLine('1,Lightning Bolt,2XM,NM,no,2.50');
    expect(result).toEqual(['1', 'Lightning Bolt', '2XM', 'NM', 'no', '2.50']);
  });

  it('handles quoted fields with commas', () => {
    const result = parseCSVLine('1,"Fire // Ice",MH2,NM,no,5.00');
    expect(result).toEqual(['1', 'Fire // Ice', 'MH2', 'NM', 'no', '5.00']);
  });

  it('handles empty fields', () => {
    const result = parseCSVLine('1,Lightning Bolt,,NM,,2.50');
    expect(result).toEqual(['1', 'Lightning Bolt', '', 'NM', '', '2.50']);
  });

  it('handles quoted fields with escaped quotes', () => {
    const result = parseCSVLine('1,"Card ""Name"" Here",SET,NM,no,1.00');
    expect(result).toEqual(['1', 'Card "Name" Here', 'SET', 'NM', 'no', '1.00']);
  });

  it('trims whitespace from fields', () => {
    const result = parseCSVLine(' 1 , Lightning Bolt , 2XM ');
    expect(result).toEqual(['1', 'Lightning Bolt', '2XM']);
  });
});

describe('parseSimpleText', () => {
  it('parses "4x Card Name" format', () => {
    const result = parseSimpleText('4x Lightning Bolt');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(4);
    expect(result[0].name).toBe('Lightning Bolt');
  });

  it('parses "4 Card Name" format', () => {
    const result = parseSimpleText('4 Counterspell');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(4);
    expect(result[0].name).toBe('Counterspell');
  });

  it('parses card name with set in parentheses', () => {
    const result = parseSimpleText('4x Lightning Bolt (2XM)');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(4);
    expect(result[0].name).toBe('Lightning Bolt');
    expect(result[0].set).toBe('2XM');
  });

  it('parses multiple lines', () => {
    const text = `4x Lightning Bolt (2XM)
2 Counterspell
1x Sol Ring`;
    const result = parseSimpleText(text);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Lightning Bolt');
    expect(result[1].name).toBe('Counterspell');
    expect(result[2].name).toBe('Sol Ring');
  });

  it('skips empty lines', () => {
    const text = `4x Lightning Bolt

2 Counterspell`;
    const result = parseSimpleText(text);
    expect(result).toHaveLength(2);
  });

  it('skips comment lines', () => {
    const text = `// This is a comment
4x Lightning Bolt
// Another comment
2 Counterspell`;
    const result = parseSimpleText(text);
    expect(result).toHaveLength(2);
  });

  it('defaults quantity to 1 for cards without quantity', () => {
    const result = parseSimpleText('Lightning Bolt');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].name).toBe('Lightning Bolt');
  });
});

describe('detectFormat', () => {
  it('detects TCGPlayer format', () => {
    const headers = ['Quantity', 'Card Name', 'Set Name', 'Condition', 'Printing', 'TCG Marketplace Price'];
    expect(detectFormat(headers)).toBe('tcgplayer');
  });

  it('detects Deckbox format', () => {
    const headers = ['Count', 'Name', 'Edition', 'Condition', 'Foil', 'Language', 'Price'];
    expect(detectFormat(headers)).toBe('deckbox');
  });

  it('detects Moxfield format', () => {
    const headers = ['Count', 'Name', 'Edition', 'Condition', 'Foil', 'Purchase Price'];
    expect(detectFormat(headers)).toBe('moxfield');
  });

  it('detects Archidekt format', () => {
    const headers = ['Count', 'Name', 'Edition', 'Condition', 'Foil', 'Purchase Price', 'Collector Number'];
    expect(detectFormat(headers)).toBe('archidekt');
  });

  it('is case insensitive', () => {
    const headers = ['COUNT', 'NAME', 'EDITION', 'CONDITION', 'FOIL', 'LANGUAGE', 'PRICE'];
    expect(detectFormat(headers)).toBe('deckbox');
  });
});

describe('parseCSV', () => {
  it('parses Moxfield format CSV', () => {
    const csv = `Count,Name,Edition,Condition,Foil,Purchase Price
1,Lightning Bolt,2XM,NM,no,2.50
4,Counterspell,CMR,LP,no,1.00`;
    
    const result = parseCSV(csv, 'auto');
    expect(result.format).toBe('moxfield');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].name).toBe('Lightning Bolt');
    expect(result.cards[0].quantity).toBe(1);
    expect(result.cards[0].set).toBe('2XM');
    expect(result.cards[0].condition).toBe('NM');
    expect(result.cards[0].foil).toBe(false);
    expect(result.cards[0].price).toBe('2.50');
  });

  it('parses Deckbox format CSV', () => {
    const csv = `Count,Name,Edition,Condition,Foil,Language,Price
1,Lightning Bolt,2XM,Near Mint,false,English,2.50
4,Counterspell,CMR,Lightly Played,true,English,1.00`;
    
    const result = parseCSV(csv, 'auto');
    expect(result.format).toBe('deckbox');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].condition).toBe('NM');
    expect(result.cards[1].condition).toBe('LP');
    expect(result.cards[1].foil).toBe(true);
  });

  it('parses TCGPlayer format CSV', () => {
    const csv = `Quantity,Card Name,Set Name,Condition,Printing,TCG Marketplace Price
1,Lightning Bolt,Double Masters,Near Mint,Normal,2.50
4,Counterspell,Commander Legends,Lightly Played,Foil,1.00`;
    
    const result = parseCSV(csv, 'auto');
    expect(result.format).toBe('tcgplayer');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].name).toBe('Lightning Bolt');
    expect(result.cards[0].set_name).toBe('Double Masters');
    expect(result.cards[1].foil).toBe(true);
  });

  it('returns error for empty file', () => {
    const result = parseCSV('', 'auto');
    expect(result.error).toBe('Empty file');
    expect(result.cards).toHaveLength(0);
  });

  it('returns error when name column is not found', () => {
    const csv = `Count,CardTitle,Edition
1,Lightning Bolt,2XM`;
    
    const result = parseCSV(csv, 'moxfield');
    expect(result.error).toBe('Could not find card name column');
  });

  it('handles cards with commas in quoted names', () => {
    const csv = `Count,Name,Edition,Condition,Foil,Purchase Price
1,"Fire // Ice",MH2,NM,no,5.00`;
    
    const result = parseCSV(csv, 'auto');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Fire // Ice');
  });

  it('skips rows without card name', () => {
    const csv = `Count,Name,Edition,Condition,Foil,Purchase Price
1,Lightning Bolt,2XM,NM,no,2.50
1,,2XM,NM,no,1.00
4,Counterspell,CMR,LP,no,1.00`;
    
    const result = parseCSV(csv, 'auto');
    expect(result.cards).toHaveLength(2);
  });

  it('normalizes condition values', () => {
    const csv = `Count,Name,Edition,Condition
1,Card A,SET,Near Mint
1,Card B,SET,Lightly Played
1,Card C,SET,Moderately Played
1,Card D,SET,Heavily Played
1,Card E,SET,Damaged`;
    
    const result = parseCSV(csv, 'moxfield');
    expect(result.cards[0].condition).toBe('NM');
    expect(result.cards[1].condition).toBe('LP');
    expect(result.cards[2].condition).toBe('MP');
    expect(result.cards[3].condition).toBe('HP');
    expect(result.cards[4].condition).toBe('DMG');
  });

  it('defaults quantity to 1 if not provided', () => {
    const csv = `Name,Edition
Lightning Bolt,2XM`;
    
    const result = parseCSV(csv, 'moxfield');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].quantity).toBe(1);
  });

  it('parses foil values correctly', () => {
    const csv = `Count,Name,Edition,Foil
1,Card A,SET,yes
1,Card B,SET,true
1,Card C,SET,foil
1,Card D,SET,1
1,Card E,SET,no
1,Card F,SET,false`;
    
    const result = parseCSV(csv, 'moxfield');
    expect(result.cards[0].foil).toBe(true);
    expect(result.cards[1].foil).toBe(true);
    expect(result.cards[2].foil).toBe(true);
    expect(result.cards[3].foil).toBe(true);
    expect(result.cards[4].foil).toBe(false);
    expect(result.cards[5].foil).toBe(false);
  });
});
