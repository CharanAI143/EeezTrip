
export interface VoiceAssistantResult {
  transcript: string;
  isFinal: boolean;
}

export class VoiceAssistant {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;

  constructor() {
    this.synthesis = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  public startListening(onResult: (result: VoiceAssistantResult) => void, onEnd: () => void) {
    if (!this.recognition || this.isListening) return;

    this.isListening = true;
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      onResult({
        transcript: result[0].transcript,
        isFinal: result.isFinal
      });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      this.isListening = false;
      onEnd();
    };

    this.recognition.start();
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public speak(text: string, onEnd?: () => void) {
    // Cancel any ongoing speech
    this.synthesis.cancel();

    // Clean markdown or special chars for better speech
    const cleanText = text
      .replace(/[*_#~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .slice(0, 300); // Limit length for speed

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    if (onEnd) {
      utterance.onend = onEnd;
    }

    this.synthesis.speak(utterance);
  }

  public stopSpeaking() {
    this.synthesis.cancel();
  }

  public isSupported() {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }
}

export const voiceAssistant = new VoiceAssistant();
