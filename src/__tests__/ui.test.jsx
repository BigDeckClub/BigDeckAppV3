import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, CardSkeleton, ListItemSkeleton } from '../components/ui/Skeleton';

describe('Button Component', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-teal-500');
  });

  it('applies secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-slate-700');
  });

  it('applies danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-red-600');
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with left icon', () => {
    const Icon = () => <span data-testid="left-icon">+</span>;
    render(<Button iconLeft={<Icon />}>Add</Button>);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders with right icon', () => {
    const Icon = () => <span data-testid="right-icon">→</span>;
    render(<Button iconRight={<Icon />}>Next</Button>);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        Modal Content
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Title">
        Content
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders footer content', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        footer={<Button>Save</Button>}
      >
        Content
      </Modal>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        Content
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<Input helperText="Enter a valid email address" />);
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('Alert Component', () => {
  it('renders children content', () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Alert title="Warning">Details here</Alert>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows close button when onClose is provided', () => {
    const handleClose = vi.fn();
    render(<Alert onClose={handleClose}>Message</Alert>);
    fireEvent.click(screen.getByLabelText('Dismiss alert'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies success variant styles', () => {
    render(<Alert variant="success">Success!</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('from-green-900/70');
  });

  it('applies error variant styles', () => {
    render(<Alert variant="error">Error!</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('from-red-900/70');
  });
});

describe('Badge Component', () => {
  it('renders with text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies different variants', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('from-green-900/70');

    rerender(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText('Danger')).toHaveClass('from-red-900/70');

    rerender(<Badge variant="mythic">Mythic</Badge>);
    expect(screen.getByText('Mythic')).toHaveClass('from-orange-600/70');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('text-[10px]');

    rerender(<Badge size="lg">Large</Badge>);
    expect(screen.getByText('Large')).toHaveClass('text-sm');
  });
});

describe('LoadingSpinner Component', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('w-8', 'h-8');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('w-12', 'h-12');
  });

  it('renders with label', () => {
    render(<LoadingSpinner label="Loading data..." />);
    expect(screen.getAllByText('Loading data...').length).toBeGreaterThan(0);
  });

  it('renders overlay when overlay prop is true', () => {
    render(<LoadingSpinner overlay />);
    const overlay = screen.getByRole('status');
    expect(overlay).toHaveClass('fixed');
  });
});

describe('EmptyState Component', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState description="Add items to get started" />);
    expect(screen.getByText('Add items to get started')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    );
    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Card Component', () => {
  it('renders children content', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with header', () => {
    render(
      <Card header={<h3>Card Title</h3>}>
        Content
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    render(
      <Card footer={<button>Action</button>}>
        Content
      </Card>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('applies hoverable class when prop is true', () => {
    const { container } = render(<Card hoverable>Content</Card>);
    const card = container.firstChild;
    expect(card.className).toContain('hover:shadow-teal-500/30');
  });

  it('applies different variants', () => {
    const { container, rerender } = render(<Card variant="compact">Compact</Card>);
    expect(container.firstChild.className).toContain('rounded-xl');

    rerender(<Card variant="stat">Stat</Card>);
    expect(container.firstChild.className).toContain('hover:shadow-lg');
  });
});

describe('Select Component', () => {
  const options = [
    { value: 'standard', label: 'Standard' },
    { value: 'modern', label: 'Modern' },
    { value: 'legacy', label: 'Legacy' },
  ];

  it('renders with label', () => {
    render(<Select label="Format" options={options} />);
    expect(screen.getByText('Format')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Select placeholder="Select a format" options={options} defaultValue="" />);
    expect(screen.getByText('Select a format')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Select error="Please select an option" options={options} />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<Select helperText="Choose your preferred format" options={options} />);
    expect(screen.getByText('Choose your preferred format')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'modern' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('associates label with select element', () => {
    render(<Select label="Format" options={options} />);
    const label = screen.getByText('Format');
    const select = screen.getByRole('combobox');
    expect(label).toHaveAttribute('for', select.id);
  });
});

describe('Skeleton Component', () => {
  it('renders with default variant', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('rounded-lg');
  });

  it('renders with text variant', () => {
    render(<Skeleton variant="text" />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('h-4', 'rounded');
  });

  it('renders with circular variant', () => {
    render(<Skeleton variant="circular" />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('applies custom width and height', () => {
    render(<Skeleton width={200} height={100} />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
  });

  it('renders multiple skeletons with count prop', () => {
    render(<Skeleton count={3} />);
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons).toHaveLength(3);
  });
});

describe('CardSkeleton Component', () => {
  it('renders with composed skeleton elements', () => {
    render(<CardSkeleton />);
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(<CardSkeleton className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });
});

describe('ListItemSkeleton Component', () => {
  it('renders with composed skeleton elements', () => {
    render(<ListItemSkeleton />);
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(<ListItemSkeleton className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });
});
