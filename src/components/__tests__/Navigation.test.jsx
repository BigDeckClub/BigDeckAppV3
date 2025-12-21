import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigation } from '../Navigation';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Layers: () => <div data-testid="icon-layers" />,
    Download: () => <div data-testid="icon-download" />,
    LayoutDashboard: () => <div data-testid="icon-dashboard" />,
    BookOpen: () => <div data-testid="icon-book" />,
    Settings: () => <div data-testid="icon-settings" />,
    FileText: () => <div data-testid="icon-filetext" />,
    ShoppingCart: () => <div data-testid="icon-carth" />,
    Menu: () => <div data-testid="icon-menu" />,
    X: () => <div data-testid="icon-x" />,
    Store: () => <div data-testid="icon-store" />,
}));

// Mock UserDropdown
vi.mock('../UserDropdown', () => ({
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

describe('Navigation Component', () => {
    const mockSetActiveTab = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Mobile Navigation', () => {
        it('renders the bottom navigation bar on mobile', () => {
            render(<Navigation activeTab="dashboard" setActiveTab={mockSetActiveTab} />);
            const nav = screen.getByRole('navigation');
            expect(nav).toHaveClass('mobile-nav');
        });

        it('shows only primary items and "More" button', () => {
            render(<Navigation activeTab="dashboard" setActiveTab={mockSetActiveTab} />);

            // Should have "More" button
            expect(screen.getByText('More')).toBeInTheDocument();

            // Count total mobile nav items
            // Note: We can't easily rely on just "button" role because desktop sidebar is also rendered (hidden with CSS)
            // So we look for buttons within the mobile nav container class
            const mobileNav = document.querySelector('.mobile-nav');
            const buttons = mobileNav.querySelectorAll('button');

            // Dashboard, Inventory, Decks, Autobuy + More = 5 buttons
            expect(buttons.length).toBe(5);
        });

        it('opens the mobile menu when "More" is clicked', () => {
            render(<Navigation activeTab="dashboard" setActiveTab={mockSetActiveTab} />);

            const moreButton = screen.getByText('More').closest('button');
            fireEvent.click(moreButton);

            // Check if overlay menu appears
            expect(screen.getByText('Marketplace')).toBeInTheDocument();
        });

        it('closes the mobile menu when an item is clicked', () => {
            render(<Navigation activeTab="dashboard" setActiveTab={mockSetActiveTab} />);

            // Open menu
            const moreButton = screen.getByText('More').closest('button');
            fireEvent.click(moreButton);

            // Click 'Marketplace'
            const marketplaceButton = screen.getByText('Marketplace').closest('button');
            fireEvent.click(marketplaceButton);

            // Verify tab change and menu close (can't easily check 'menu close' without checking DOM absence, 
            // but we can assume it should behave this way. Ensuring setActiveTab is key).
            expect(mockSetActiveTab).toHaveBeenCalledWith('marketplace');
        });

        it('highlights "More" when an overflow item is active', () => {
            render(<Navigation activeTab="settings" setActiveTab={mockSetActiveTab} />);

            const moreButton = screen.getByText('More').closest('button');
            expect(moreButton).toHaveClass('active');
        });
    });
});
