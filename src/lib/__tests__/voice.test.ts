import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceAssistant } from '../voice';

describe('VoiceAssistant', () => {
  let mockRecognition: any;
  let mockSynthesis: any;

  beforeEach(() => {
    mockRecognition = {
      continuous: false,
      interimResults: false,
      lang: 'en-US',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onend: null,
      onerror: null,
    };

    mockSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      resume: vi.fn(),
      paused: false,
    };

    // Attach to existing window and globalThis
    const SpeechRecognitionMock = vi.fn().mockImplementation(function (this: any) {
      return mockRecognition;
    });
    (window as any).SpeechRecognition = SpeechRecognitionMock;
    (globalThis as any).SpeechRecognition = SpeechRecognitionMock;
    (window as any).speechSynthesis = mockSynthesis;
    (globalThis as any).speechSynthesis = mockSynthesis;
    (globalThis as any).SpeechSynthesisUtterance = vi.fn().mockImplementation(function (this: any, text: string) {
      this.text = text;
      this.rate = 1;
      this.pitch = 1;
      this.onend = null;
      this.onerror = null;
      return this;
    });
    (window as any).SpeechSynthesisUtterance = (globalThis as any).SpeechSynthesisUtterance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects speech recognition support correctly', () => {
    const assistant = new VoiceAssistant();
    expect(assistant.isSupported()).toBe(true);
    expect(assistant.isSpeechSynthesisSupported()).toBe(true);
  });

  it('starts listening and dispatches transcript result', () => {
    const assistant = new VoiceAssistant();
    const onResult = vi.fn();
    const onEnd = vi.fn();

    assistant.startListening(onResult, onEnd);
    expect(assistant.isListening).toBe(true);
    expect(mockRecognition.start).toHaveBeenCalled();

    // Simulate recognition result
    mockRecognition.onresult({
      results: [
        [{ transcript: 'I want to visit Paris ' }],
        [{ transcript: 'with 5000 dollars', isFinal: true }],
      ],
    });

    expect(onResult).toHaveBeenCalledWith({
      transcript: 'I want to visit Paris with 5000 dollars',
      isFinal: true,
    });

    // Simulate recognition end
    mockRecognition.onend();
    expect(assistant.isListening).toBe(false);
    expect(onEnd).toHaveBeenCalled();
  });

  it('handles error gracefully and calls onError callback', () => {
    const assistant = new VoiceAssistant();
    const onResult = vi.fn();
    const onEnd = vi.fn();
    const onError = vi.fn();

    assistant.startListening(onResult, onEnd, onError);
    mockRecognition.onerror({ error: 'not-allowed' });

    expect(assistant.isListening).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Microphone access was denied'));
    expect(onEnd).toHaveBeenCalled();
  });

  it('stops listening when stopListening is invoked', () => {
    const assistant = new VoiceAssistant();
    assistant.startListening(vi.fn(), vi.fn());
    assistant.stopListening();
    expect(mockRecognition.stop).toHaveBeenCalled();
    expect(assistant.isListening).toBe(false);
  });

  it('aborts listening when abortListening is invoked', () => {
    const assistant = new VoiceAssistant();
    assistant.startListening(vi.fn(), vi.fn());
    assistant.abortListening();
    expect(mockRecognition.abort).toHaveBeenCalled();
    expect(assistant.isListening).toBe(false);
  });

  it('speaks clean text using SpeechSynthesis', () => {
    const assistant = new VoiceAssistant();
    const onEnd = vi.fn();

    assistant.speak('**Hello** world! [Click here](http://example.com)', onEnd);
    expect(mockSynthesis.cancel).toHaveBeenCalled();
    expect(mockSynthesis.speak).toHaveBeenCalled();
  });
});
