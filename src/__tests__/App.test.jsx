import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch for Scryfall API calls
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('renders the application title', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('BigDeck.app')).toBeInTheDocument();
    });
  });

  it('renders the Inventory tab button', async () => {
    render(<App />);
    await waitFor(() => {
      const inventoryButtons = screen.getAllByText('Inventory');
      expect(inventoryButtons.length).toBeGreaterThan(0);
    });
  });

  it('renders the Imports tab button', async () => {
    render(<App />);
    await waitFor(() => {
      const importsButtons = screen.getAllByText('Imports');
      expect(importsButtons.length).toBeGreaterThan(0);
    });
  });

  it('renders the Decks tab button', async () => {
    render(<App />);
    await waitFor(() => {
      const decksButtons = screen.getAllByText('Decks');
      expect(decksButtons.length).toBeGreaterThan(0);
    });
  });
});
