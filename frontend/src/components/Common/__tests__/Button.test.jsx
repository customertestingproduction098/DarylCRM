import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '../Button';

describe('Button Component', () => {
  it('renders button with correct label text', () => {
    render(<Button>Schedule Job</Button>);
    expect(screen.getByText('Schedule Job')).toBeInTheDocument();
  });

  it('applies primary styling by default', () => {
    const { container } = render(<Button variant="primary">Submit</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-blue-800');
  });

  it('disables button when disabled prop is provided', () => {
    render(<Button disabled>Disabled Action</Button>);
    expect(screen.getByText('Disabled Action').closest('button')).toBeDisabled();
  });
});
