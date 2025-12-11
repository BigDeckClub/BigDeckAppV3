/**
 * Component tests for ColorFilterChips UI
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorFilterChips, ManaSymbol, ColorCombo, FilterChip } from '../components/ui/ColorFilterChips';
import { createColorFilter, PRESET_COLOR_FILTERS } from '../constants/mtgColors';

describe('ManaSymbol', () => {
  it('should render color symbol with correct label', () => {
    render(<ManaSymbol color="R" />);
    const symbol = screen.getByLabelText('Red');
    expect(symbol).toBeInTheDocument();
    expect(symbol).toHaveTextContent('R');
  });

  it('should render colorless with diamond symbol', () => {
    render(<ManaSymbol color="C" />);
    const symbol = screen.getByLabelText('Colorless');
    expect(symbol).toBeInTheDocument();
    expect(symbol).toHaveTextContent('◇');
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(<ManaSymbol color="W" size="sm" />);
    expect(screen.getByLabelText('White')).toHaveClass('w-4', 'h-4');

    rerender(<ManaSymbol color="W" size="lg" />);
    expect(screen.getByLabelText('White')).toHaveClass('w-6', 'h-6');
  });

  it('should return null for invalid color', () => {
    const { container } = render(<ManaSymbol color="X" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ColorCombo', () => {
  it('should render colorless for empty colors', () => {
    render(<ColorCombo colors={[]} />);
    expect(screen.getByLabelText('Colorless')).toBeInTheDocument();
  });

  it('should render colorless for null colors', () => {
    render(<ColorCombo colors={null} />);
    expect(screen.getByLabelText('Colorless')).toBeInTheDocument();
  });

  it('should render multiple colors in WUBRG order', () => {
    render(<ColorCombo colors={['G', 'W', 'U']} />);
    // Colors should be sorted: W, U, G
    expect(screen.getByLabelText('White')).toBeInTheDocument();
    expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    expect(screen.getByLabelText('Green')).toBeInTheDocument();
  });

  it('should render single color', () => {
    render(<ColorCombo colors={['B']} />);
    expect(screen.getByLabelText('Black')).toBeInTheDocument();
  });
});

describe('FilterChip', () => {
  const mockFilter = createColorFilter('mono', ['R']);
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  it('should render filter with label and color symbol', () => {
    render(<FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />);
    expect(screen.getByText('Mono Red')).toBeInTheDocument();
    expect(screen.getByLabelText('Red')).toBeInTheDocument();
  });

  it('should have checkbox role with correct aria-checked', () => {
    const { rerender } = render(
      <FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />
    );
    const button = screen.getByRole('checkbox');
    expect(button).toHaveAttribute('aria-checked', 'false');

    rerender(<FilterChip filter={mockFilter} isSelected={true} onToggle={mockOnToggle} />);
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  it('should call onToggle when clicked', () => {
    render(<FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockOnToggle).toHaveBeenCalledWith(mockFilter);
  });

  it('should call onToggle on Enter key', () => {
    render(<FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />);

    const button = screen.getByRole('checkbox');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockOnToggle).toHaveBeenCalledWith(mockFilter);
  });

  it('should call onToggle on Space key', () => {
    render(<FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />);

    const button = screen.getByRole('checkbox');
    fireEvent.keyDown(button, { key: ' ' });
    expect(mockOnToggle).toHaveBeenCalledWith(mockFilter);
  });

  it('should show X icon when selected', () => {
    const { rerender } = render(
      <FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />
    );
    // X icon should not be present when not selected
    const button = screen.getByRole('checkbox');
    expect(button.querySelector('svg.lucide-x')).not.toBeInTheDocument();

    rerender(<FilterChip filter={mockFilter} isSelected={true} onToggle={mockOnToggle} />);
    // X icon should be present when selected
    expect(button.querySelector('svg.lucide-x')).toBeInTheDocument();
  });

  it('should apply correct styles when selected', () => {
    const { rerender } = render(
      <FilterChip filter={mockFilter} isSelected={false} onToggle={mockOnToggle} />
    );
    const button = screen.getByRole('checkbox');
    expect(button).toHaveClass('bg-[var(--muted-surface)]');

    rerender(<FilterChip filter={mockFilter} isSelected={true} onToggle={mockOnToggle} />);
    expect(button).toHaveClass('bg-teal-600');
  });
});

describe('ColorFilterChips', () => {
  const mockOnToggle = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
    mockOnClear.mockClear();
  });

  describe('inline variant (default)', () => {
    it('should render all preset filters', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );

      // Should show colorless
      expect(screen.getByText('Colorless')).toBeInTheDocument();

      // Should show all mono colors
      expect(screen.getByText('Mono White')).toBeInTheDocument();
      expect(screen.getByText('Mono Blue')).toBeInTheDocument();
      expect(screen.getByText('Mono Black')).toBeInTheDocument();
      expect(screen.getByText('Mono Red')).toBeInTheDocument();
      expect(screen.getByText('Mono Green')).toBeInTheDocument();

      // Should show some guild names
      expect(screen.getByText('Azorius')).toBeInTheDocument();
      expect(screen.getByText('Dimir')).toBeInTheDocument();
      expect(screen.getByText('Rakdos')).toBeInTheDocument();

      // Should show some shard/wedge names
      expect(screen.getByText('Esper')).toBeInTheDocument();
      expect(screen.getByText('Jund')).toBeInTheDocument();
    });

    it('should show label by default', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );
      expect(screen.getByText('Filter by Color Identity')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          showLabel={false}
        />
      );
      expect(screen.queryByText('Filter by Color Identity')).not.toBeInTheDocument();
    });

    it('should show clear button when filters are selected', () => {
      const selectedFilter = createColorFilter('mono', ['R']);
      render(
        <ColorFilterChips
          selectedFilters={[selectedFilter]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('should not show clear button when no filters selected', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );
      expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    });

    it('should call onClearFilters when clear button clicked', () => {
      const selectedFilter = createColorFilter('mono', ['R']);
      render(
        <ColorFilterChips
          selectedFilters={[selectedFilter]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );

      fireEvent.click(screen.getByText('Clear filters'));
      expect(mockOnClear).toHaveBeenCalled();
    });

    it('should call onToggleFilter when chip clicked', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );

      fireEvent.click(screen.getByText('Mono Red'));
      expect(mockOnToggle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mono',
          colors: ['R'],
          label: 'Mono Red',
        })
      );
    });

    it('should mark selected filters as checked', () => {
      const selectedFilter = PRESET_COLOR_FILTERS.find(f => f.id === 'mono-R');
      render(
        <ColorFilterChips
          selectedFilters={[selectedFilter]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );

      const monoRedChip = screen.getByLabelText('Filter by Mono Red');
      expect(monoRedChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should show loading state', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          isLoading={true}
        />
      );
      expect(screen.getByText('(loading...)')).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('should show add button', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="compact"
        />
      );
      expect(screen.getByText('+ Add')).toBeInTheDocument();
    });

    it('should show selected filters as chips', () => {
      const selectedFilter = createColorFilter('mono', ['R']);
      render(
        <ColorFilterChips
          selectedFilters={[selectedFilter]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="compact"
        />
      );
      expect(screen.getByText('Mono Red')).toBeInTheDocument();
    });

    it('should open dropdown when add button clicked', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="compact"
        />
      );

      fireEvent.click(screen.getByText('+ Add'));

      // Dropdown should now be open with filter sections
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Mono Color')).toBeInTheDocument();
      expect(screen.getByText('Two Colors (Guilds)')).toBeInTheDocument();
    });

    it('should close dropdown on Escape', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="compact"
        />
      );

      fireEvent.click(screen.getByText('+ Add'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should show clear link when filters selected', () => {
      const selectedFilter = createColorFilter('mono', ['R']);
      render(
        <ColorFilterChips
          selectedFilters={[selectedFilter]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="compact"
        />
      );
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  describe('dropdown variant', () => {
    it('should show dropdown trigger button', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );
      expect(screen.getByText('Filter by Color')).toBeInTheDocument();
    });

    it('should show selected count in trigger', () => {
      const filters = [
        createColorFilter('mono', ['R']),
        createColorFilter('mono', ['G']),
      ];
      render(
        <ColorFilterChips
          selectedFilters={filters}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );
      expect(screen.getByText('2 colors selected')).toBeInTheDocument();
    });

    it('should show singular when 1 filter selected', () => {
      const filters = [createColorFilter('mono', ['R'])];
      render(
        <ColorFilterChips
          selectedFilters={filters}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );
      expect(screen.getByText('1 color selected')).toBeInTheDocument();
    });

    it('should open dropdown on click', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );

      fireEvent.click(screen.getByText('Filter by Color'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Filter by Color Identity')).toBeInTheDocument();
    });

    it('should have clear all button in dropdown header', () => {
      const selectedFilter = createColorFilter('mono', ['R']);
      render(
        <ColorFilterChips
          selectedFilters={[selectedFilter]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );

      fireEvent.click(screen.getByText('1 color selected'));
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-expanded on dropdown trigger', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );

      const trigger = screen.getByText('Filter by Color').closest('button');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup on dropdown trigger', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          variant="dropdown"
        />
      );

      const trigger = screen.getByText('Filter by Color').closest('button');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have accessible labels for all filter chips', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );

      expect(screen.getByLabelText('Filter by Colorless')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Mono Red')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Azorius')).toBeInTheDocument();
    });

    it('should be keyboard navigable with Enter', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
        />
      );

      const chip = screen.getByLabelText('Filter by Colorless');
      chip.focus();

      fireEvent.keyDown(chip, { key: 'Enter' });
      expect(mockOnToggle).toHaveBeenCalled();
    });
  });

  describe('size prop', () => {
    it('should apply sm size classes', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          size="sm"
        />
      );

      const colorlessChip = screen.getByLabelText('Filter by Colorless');
      expect(colorlessChip).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('should apply lg size classes', () => {
      render(
        <ColorFilterChips
          selectedFilters={[]}
          onToggleFilter={mockOnToggle}
          onClearFilters={mockOnClear}
          size="lg"
        />
      );

      const colorlessChip = screen.getByLabelText('Filter by Colorless');
      expect(colorlessChip).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });
});
