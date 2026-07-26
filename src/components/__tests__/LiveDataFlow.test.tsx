import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { FreshnessBadge } from '../FreshnessBadge';

describe('Frontend Live Data Freshness Badge Component', () => {
  it('renders freshness status correctly when cached', () => {
    render(<FreshnessBadge isCached={true} />);
    expect(screen.getByText(/Live Data Platform · Cached & Fresh/i)).toBeDefined();
  });

  it('renders freshness status correctly when real-time synced', () => {
    render(<FreshnessBadge isCached={false} />);
    expect(screen.getByText(/Live Data Platform · Real-time Synchronized/i)).toBeDefined();
  });
});
