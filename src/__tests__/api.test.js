import { describe, it, expect } from 'vitest';
import { API_BASE } from '../config/api';

describe('API configuration', () => {
  it('exports API_BASE', () => {
    expect(API_BASE).toBeDefined();
  });

  it('API_BASE is a string', () => {
    expect(typeof API_BASE).toBe('string');
  });

  it('API_BASE defaults to /api when no environment variable is set', () => {
    // In test environment, VITE_API_BASE is not set, so it should default to '/api'
    expect(API_BASE).toBe('/api');
  });
});
