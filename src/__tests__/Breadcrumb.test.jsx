import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Breadcrumb } from '../components/inventory/Breadcrumb';

describe('Breadcrumb Component', () => {
  it('renders nothing when navigationPath is empty', () => {
    const { container } = render(
      <Breadcrumb navigationPath={[]} onNavigate={() => {}} />
    );
    expect(container.querySelector('nav')).not.toBeInTheDocument();
  });

  it('renders single segment for All Cards view', () => {
    render(
      <Breadcrumb 
        navigationPath={[{ label: 'All Cards', tab: 'all' }]} 
        onNavigate={() => {}} 
      />
    );
    
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('All Cards')).toBeInTheDocument();
    // aria-current is on the parent span element
    expect(screen.getByText('All Cards').closest('[aria-current="page"]')).toBeInTheDocument();
  });

  it('renders two segments for Trash view', () => {
    const handleNavigate = vi.fn();
    render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'Trash', tab: 'Trash' }
        ]} 
        onNavigate={handleNavigate} 
      />
    );
    
    // First segment should be clickable
    const allCardsButton = screen.getByRole('button', { name: /All Cards/i });
    expect(allCardsButton).toBeInTheDocument();
    
    // Last segment should not be clickable (has aria-current="page")
    expect(screen.getByText('Trash').closest('[aria-current="page"]')).toBeInTheDocument();
  });

  it('renders folder path correctly', () => {
    const handleNavigate = vi.fn();
    render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'Rare Cards', tab: 'Rare Cards' }
        ]} 
        onNavigate={handleNavigate} 
      />
    );
    
    expect(screen.getByRole('button', { name: /All Cards/i })).toBeInTheDocument();
    expect(screen.getByText('Rare Cards')).toBeInTheDocument();
  });

  it('renders deck path correctly', () => {
    const handleNavigate = vi.fn();
    render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'My Commander Deck', tab: 'deck-123' }
        ]} 
        onNavigate={handleNavigate} 
      />
    );
    
    expect(screen.getByRole('button', { name: /All Cards/i })).toBeInTheDocument();
    expect(screen.getByText('My Commander Deck')).toBeInTheDocument();
  });

  it('calls onNavigate when clickable segment is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'Trash', tab: 'Trash' }
        ]} 
        onNavigate={handleNavigate} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /All Cards/i }));
    expect(handleNavigate).toHaveBeenCalledWith('all');
  });

  it('truncates long names', () => {
    render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'This Is A Very Long Folder Name That Should Be Truncated', tab: 'long-folder' }
        ]} 
        onNavigate={() => {}} 
      />
    );
    
    // Check that the long name is truncated (contains ellipsis)
    const truncatedText = screen.getByTitle('This Is A Very Long Folder Name That Should Be Truncated');
    expect(truncatedText.textContent).toContain('…');
    expect(truncatedText.textContent.length).toBeLessThan(25);
  });

  it('has accessible navigation structure', () => {
    render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'Folder', tab: 'Folder' }
        ]} 
        onNavigate={() => {}} 
      />
    );
    
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders chevron separators between segments', () => {
    const { container } = render(
      <Breadcrumb 
        navigationPath={[
          { label: 'All Cards', tab: 'all' },
          { label: 'Folder', tab: 'Folder' }
        ]} 
        onNavigate={() => {}} 
      />
    );
    
    // Check for chevron icon (it has aria-hidden="true")
    const chevrons = container.querySelectorAll('[aria-hidden="true"]');
    expect(chevrons.length).toBeGreaterThan(0);
  });
});
