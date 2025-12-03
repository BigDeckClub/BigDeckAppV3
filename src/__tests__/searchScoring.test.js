import { describe, it, expect } from 'vitest';
import { scoreCardMatch } from '../utils/searchScoring';

describe('scoreCardMatch', () => {
  it('returns 1000 for exact match', () => {
    expect(scoreCardMatch('Sol Ring', 'sol ring')).toBe(1000);
    expect(scoreCardMatch('Black Lotus', 'black lotus')).toBe(1000);
  });

  it('returns 500 for starts-with match', () => {
    expect(scoreCardMatch('Sol Ring', 'sol')).toBe(500);
    expect(scoreCardMatch('Lightning Bolt', 'light')).toBe(500);
  });

  it('returns 450 for multi-word partial match', () => {
    // "sol r" starts with "sol" so it returns 500 (starts-with match)
    // To test multi-word matching, we need a query that doesn't match starts-with
    expect(scoreCardMatch('Force of Will', 'for w')).toBe(450);
    expect(scoreCardMatch('Path to Exile', 'pat ex')).toBe(450);
  });

  it('returns 400 for word boundary match', () => {
    expect(scoreCardMatch('Sol Ring', 'ring')).toBe(400);
    expect(scoreCardMatch('Dark Confidant', 'conf')).toBe(400);
  });

  it('returns score between 100-200 for substring match', () => {
    const score = scoreCardMatch('Counterspell', 'spell');
    expect(score).toBeGreaterThan(100);
    expect(score).toBeLessThan(200);
  });

  it('returns 50 for fuzzy match', () => {
    expect(scoreCardMatch('Counterspell', 'cnl')).toBe(50);
  });

  it('returns 0 for no match', () => {
    expect(scoreCardMatch('Sol Ring', 'xyz')).toBe(0);
    expect(scoreCardMatch('Lightning Bolt', 'aaa')).toBe(0);
  });

  it('is case insensitive', () => {
    expect(scoreCardMatch('Sol Ring', 'SOL RING')).toBe(1000);
    expect(scoreCardMatch('BLACK LOTUS', 'black lotus')).toBe(1000);
  });

  it('ranks exact matches higher than partial matches', () => {
    const exactScore = scoreCardMatch('Sol', 'sol');
    const partialScore = scoreCardMatch('Sol Ring', 'sol');
    expect(exactScore).toBeGreaterThan(partialScore);
  });

  it('ranks starts-with higher than word boundary', () => {
    const startsWithScore = scoreCardMatch('Sol Ring', 'sol');
    const wordBoundaryScore = scoreCardMatch('Sol Ring', 'ring');
    expect(startsWithScore).toBeGreaterThan(wordBoundaryScore);
  });
});
