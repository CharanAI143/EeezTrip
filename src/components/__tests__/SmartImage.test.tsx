import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartImage } from '../SmartImage';
import * as imageService from '../../services/imageService';

// Mock the image service
vi.mock('../../services/imageService', () => ({
  fetchPlaceImages: vi.fn(),
}));

describe('SmartImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    (imageService.fetchPlaceImages as any).mockReturnValue(new Promise(() => {}));
    render(<SmartImage place="Paris" />);
    // Looking for the loader by searching for any element with the animate-spin class (simplified)
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('renders image when fetch is successful', async () => {
    const mockImages = [{ url: 'https://example.com/paris.jpg', alt: 'Paris', author: 'User', source: 'Unsplash' }];
    (imageService.fetchPlaceImages as any).mockResolvedValue(mockImages);

    render(<SmartImage place="Paris" />);

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/paris.jpg');
    });
  });

  it('renders fallback image when fetch fails', async () => {
    (imageService.fetchPlaceImages as any).mockRejectedValue(new Error('Failed'));

    render(<SmartImage place="Paris" />);

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toContain('source.unsplash.com');
    });
  });
});
