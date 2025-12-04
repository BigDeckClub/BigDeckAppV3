import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertSettings } from '../components/settings/AlertSettings';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: () => <span data-testid="bell-icon">🔔</span>,
}));

// Mock useApi hook
vi.mock('../hooks/useApi', () => ({
  useApi: () => ({
    put: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({ cardNames: ['lightning bolt', 'sol ring', 'counterspell'] }),
  }),
}));

describe('AlertSettings', () => {
  const mockInventory = [
    { id: 1, name: 'Lightning Bolt', set: 'M21', low_inventory_alert: true, low_inventory_threshold: 5 },
    { id: 2, name: 'Sol Ring', set: 'CMD', low_inventory_alert: true, low_inventory_threshold: 10 },
    { id: 3, name: 'Counterspell', set: 'MH2', low_inventory_alert: true, low_inventory_threshold: 3 },
    { id: 4, name: 'Forest', set: 'M21', low_inventory_alert: true, low_inventory_threshold: 2 },
    { id: 5, name: 'Island', set: 'M21', low_inventory_alert: false, low_inventory_threshold: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component with header', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    expect(screen.getByText('Low Inventory Alerts')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('should display cards with alerts enabled', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
    expect(screen.getByText('Sol Ring')).toBeInTheDocument();
    expect(screen.getByText('Counterspell')).toBeInTheDocument();
    expect(screen.getByText('Forest')).toBeInTheDocument();
    // Island has low_inventory_alert=false, so should not be displayed
    expect(screen.queryByText('Island')).not.toBeInTheDocument();
  });

  it('should show filter toggle when there are alerts', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    const checkbox = screen.getByRole('checkbox', { name: /show only cards in deck templates/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('should show card count when filter is off', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    expect(screen.getByText('4 cards')).toBeInTheDocument();
  });

  it('should update count display when filter is toggled', async () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    const checkbox = screen.getByRole('checkbox', { name: /show only cards in deck templates/i });
    fireEvent.click(checkbox);
    
    // After toggle, should show filtered count
    await waitFor(() => {
      expect(screen.getByText(/of 4 cards/)).toBeInTheDocument();
    });
  });

  it('should not show filter toggle when no alerts exist', () => {
    const emptyInventory = [
      { id: 1, name: 'Lightning Bolt', set: 'M21', low_inventory_alert: false, low_inventory_threshold: 0 },
    ];
    
    render(<AlertSettings inventory={emptyInventory} />);
    
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('No low inventory alerts enabled yet')).toBeInTheDocument();
  });

  it('should show empty state when no inventory provided', () => {
    render(<AlertSettings inventory={[]} />);
    
    expect(screen.getByText('No low inventory alerts enabled yet')).toBeInTheDocument();
  });

  it('should show Remove button for each card', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons.length).toBe(4); // 4 cards with alerts
  });

  it('should display set information for each card', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    // M21 appears twice (Lightning Bolt and Forest)
    const m21Elements = screen.getAllByText('M21');
    expect(m21Elements.length).toBe(2);
    expect(screen.getByText('CMD')).toBeInTheDocument();
    expect(screen.getByText('MH2')).toBeInTheDocument();
  });

  it('should display threshold inputs for each card', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    const thresholdInputs = screen.getAllByRole('spinbutton');
    expect(thresholdInputs.length).toBe(4);
    expect(thresholdInputs[0]).toHaveValue(5); // Lightning Bolt threshold
  });

  it('should show how to use section', () => {
    render(<AlertSettings inventory={mockInventory} />);
    
    expect(screen.getByText('How to Use Low Inventory Alerts')).toBeInTheDocument();
  });
});
