import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceFormFiller } from '../VoiceFormFiller';
import { voiceAssistant } from '../../lib/voice';

vi.mock('../../lib/gemini', () => ({
  extractTripDataFromVoice: vi.fn().mockResolvedValue({
    startLocation: 'Paris',
    destination: 'Tokyo',
    budget: 5000,
    duration: 7,
  }),
}));

vi.mock('../../api/client', () => ({
  transcribeAudio: vi.fn().mockResolvedValue('I want to go to Tokyo from Paris for 7 days with 5000 budget'),
}));

describe('VoiceFormFiller', () => {
  beforeEach(() => {
    vi.spyOn(voiceAssistant, 'isSupported').mockReturnValue(true);
    vi.spyOn(voiceAssistant, 'speak').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders microphone button', () => {
    const handleExtract = vi.fn();
    render(<VoiceFormFiller onDataExtracted={handleExtract} />);
    const button = screen.getByRole('button', { name: /start voice assistant/i });
    expect(button).toBeDefined();
  });

  it('triggers voice listening on click and processes extracted data', async () => {
    const handleExtract = vi.fn();
    
    // Mock startListening to simulate a result
    vi.spyOn(voiceAssistant, 'startListening').mockImplementation((onResult, onEnd) => {
      onResult({
        transcript: 'I want to go to Tokyo from Paris for 7 days with 5000 budget',
        isFinal: true,
      });
      onEnd();
    });

    render(<VoiceFormFiller onDataExtracted={handleExtract} />);
    const button = screen.getByRole('button', { name: /start voice assistant/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(handleExtract).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: 'Tokyo',
          startLocation: 'Paris',
          budget: 5000,
          duration: 7,
        })
      );
    });
  });
});
