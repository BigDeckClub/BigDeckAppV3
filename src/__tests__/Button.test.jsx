import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '../components/ui/Button';

describe('Button', () => {
  it('renders with children and accessible label', () => {
    render(<Button ariaLabel="create" data-testid="btn">Create</Button>);
    const btn = screen.getByTestId('btn');
    expect(btn).toBeTruthy();
    expect(btn).toHaveAttribute('aria-label', 'create');
    expect(btn).toHaveTextContent('Create');
  });
});
