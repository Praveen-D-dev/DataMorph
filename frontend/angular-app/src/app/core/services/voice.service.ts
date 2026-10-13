import { Injectable, signal } from "@angular/core";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Injectable({
  providedIn: "root"
})
export class VoiceService {
  // Speech Recognition (Speech-to-Text) signals
  isListening = signal<boolean>(false);
  transcript = signal<string>("");
  error = signal<string | null>(null);

  // Speech Synthesis (Text-to-Speech) signals - defaulted to false for privacy & non-intrusiveness
  isSpeaking = signal<boolean>(false);
  speechEnabled = signal<boolean>(false);
  voiceRate = signal<number>(1.0);
  voiceVolume = signal<number>(1.0);
  lastSpokenText = signal<string>("");

  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  private initSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.error.set(null);
      };

      this.recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        this.transcript.set(currentTranscript);
      };

      this.recognition.onerror = (event: any) => {
        this.error.set(`Speech error: ${event.error}`);
        this.isListening.set(false);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };
    }
  }

  private initSpeechSynthesis() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    this.synth = window.speechSynthesis;

    // Load persisted preferences
    try {
      const savedEnabled = localStorage.getItem("datamorph_speech_enabled");
      if (savedEnabled !== null) {
        this.speechEnabled.set(savedEnabled === "true");
      }
      const savedRate = localStorage.getItem("datamorph_speech_rate");
      if (savedRate) {
        this.voiceRate.set(parseFloat(savedRate) || 1.0);
      }
    } catch {}

    // Populate voice selection
    const pickVoice = () => {
      if (!this.synth) return;
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;

      // Prefer high-clarity local system voices (Windows / macOS / Linux)
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Jenny") ||
            v.name.includes("David") ||
            v.name.includes("Zira") ||
            v.name.includes("Samantha") ||
            v.name.includes("Alex"))
      );

      this.selectedVoice = preferred || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    };

    pickVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = pickVoice;
    }
  }

  startListening(): boolean {
    if (!this.recognition) {
      this.error.set("Web Speech API not supported in this browser. You can type commands directly.");
      return false;
    }
    try {
      // Stop any ongoing speech before listening
      this.stopSpeaking();
      this.transcript.set("");
      this.recognition.start();
      return true;
    } catch (err: any) {
      this.error.set(err.message);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening()) {
      this.recognition.stop();
    }
  }

  /**
   * Speaks the given text using SpeechSynthesis with natural tone and pitch.
   */
  speak(text: string, onEnd?: () => void) {
    if (!this.synth || !this.speechEnabled() || !text) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.synth.cancel(); // Cancel any lingering speech

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = this.voiceRate();
      utterance.pitch = 1.0;
      utterance.volume = this.voiceVolume();

      utterance.onstart = () => {
        this.isSpeaking.set(true);
        this.lastSpokenText.set(text);
      };

      utterance.onend = () => {
        this.isSpeaking.set(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking.set(false);
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    } catch {
      this.isSpeaking.set(false);
      if (onEnd) onEnd();
    }
  }

  /**
   * Responds with the required confirmation phrase:
   * "Okay, now I understand your vision. [Action summary]"
   */
  speakVisionConfirmation(actionSummary?: string) {
    if (!actionSummary) return;
    const lower = actionSummary.toLowerCase();
    const isErrorOrNoop = lower.includes("not recognized") || lower.includes("could not") || lower.includes("unrecognized") || lower.includes("no chart found");
    if (!isErrorOrNoop) {
      const prefix = "Okay, now I understand your vision.";
      this.speak(`${prefix} ${actionSummary}`);
    } else {
      this.speak(actionSummary);
    }
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking.set(false);
    }
  }

  toggleSpeech(enabled: boolean) {
    this.speechEnabled.set(enabled);
    if (!enabled) this.stopSpeaking();
    try {
      localStorage.setItem("datamorph_speech_enabled", enabled.toString());
    } catch {}
  }

  setSpeechRate(rate: number) {
    this.voiceRate.set(rate);
    try {
      localStorage.setItem("datamorph_speech_rate", rate.toString());
    } catch {}
  }

  testVoice() {
    this.speakVisionConfirmation("DataMorph is ready to transform and visualize your data.");
  }
}
