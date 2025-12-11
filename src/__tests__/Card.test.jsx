import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '../components/ui/Card';

describe('Card', () => {
  it('renders children and role/aria attributes', () => {
    render(<Card ariaLabel="card-1" data-testid="card"><div>Hi</div></Card>);
    const card = screen.getByTestId('card');
    expect(card).toBeTruthy();
    expect(card).toHaveAttribute('aria-label', 'card-1');
    expect(card).toHaveTextContent('Hi');
  });
});
