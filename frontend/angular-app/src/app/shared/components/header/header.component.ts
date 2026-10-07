import { Component, EventEmitter, Output, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DatasetService } from "../../../core/services/dataset.service";
import { VoiceService } from "../../../core/services/voice.service";
import { AppMenuComponent } from "../app-menu/app-menu.component";
import { SettingsModalComponent } from "../settings-modal/settings-modal.component";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, AppMenuComponent, SettingsModalComponent],
  template: `
    <header class="app-header glass-panel">
      <!-- Left: Hamburger Menu & DataMorph Branding -->
      <div class="header-left">
        <button class="icon-btn menu-toggle-btn" (click)="isMenuOpen.set(true)" title="Application Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="4" x2="20" y1="6" y2="6"></line>
            <line x1="4" x2="20" y1="12" y2="12"></line>
            <line x1="4" x2="20" y1="18" y2="18"></line>
          </svg>
        </button>

        <div class="brand-group">
          <div class="logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">DataMorph</span>
            <span class="brand-tag">Adaptive Framework</span>
          </div>
        </div>
      </div>

      <!-- Center: Active Voice State Banner / Processing Pill (if active) -->
      <!-- Center: Active Voice State Banner / Soundwaves / Conversational Pill -->
      <div class="header-center">
        @if (voice.isSpeaking()) {
          <div class="voice-status-pill speaking" (click)="voice.stopSpeaking()" title="Click to stop speech">
            <div class="soundwave-indicator">
              <span class="wave-bar bar-1"></span>
              <span class="wave-bar bar-2"></span>
              <span class="wave-bar bar-3"></span>
              <span class="wave-bar bar-4"></span>
            </div>
            <span class="pill-text">AI Voice: {{ voice.lastSpokenText() }}</span>
          </div>
        } @else if (voiceState() === 'listening') {
          <div class="voice-status-pill listening">
            <span class="recording-dot"></span>
            <span class="pill-text">Listening... Speak command</span>
          </div>
        } @else if (voiceState() === 'processing') {
          <div class="voice-status-pill processing">
            <span class="spinner-dot"></span>
            <span class="pill-text">Analyzing command intent...</span>
          </div>
        } @else if (voiceState() === 'success') {
          <div class="voice-status-pill success">
            <span class="checkmark">✓</span>
            <span class="pill-text">{{ voiceSuccessText() }}</span>
          </div>
        } @else if (voiceState() === 'error') {
          <div class="voice-status-pill error">
            <span class="err-icon">!</span>
            <span class="pill-text">{{ voiceErrorText() }}</span>
          </div>
        }
      </div>

      <!-- Right: Settings FIRST, Voice SECOND (Strict Specification Order) -->
      <div class="header-right">
        <!-- 1. Settings Button FIRST -->
        <button
          class="icon-btn settings-btn"
          (click)="isSettingsOpen.set(true)"
          title="System Settings"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>

        <!-- 2. Voice Button SECOND -->
        <button
          class="voice-btn"
          [class.active-recording]="voiceState() === 'listening'"
          [class.active-processing]="voiceState() === 'processing'"
          (click)="handleVoiceClick()"
          title="Voice Control (Web Speech & Natural Language)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
          @if (voiceState() === 'listening') {
            <span class="recording-pulse"></span>
          }
        </button>
      </div>
    </header>

    <!-- App-Level Menu Drawer -->
    <app-app-menu
      [isOpen]="isMenuOpen()"
      (close)="isMenuOpen.set(false)"
      (action)="handleMenuAction($event)"
    ></app-app-menu>

    <!-- Settings Modal -->
    <app-settings-modal
      [isOpen]="isSettingsOpen()"
      (close)="isSettingsOpen.set(false)"
    ></app-settings-modal>
  `,
  styles: [`
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 20px;
      margin: 14px 20px 0 20px;
      z-index: 90;
      border-radius: var(--radius-lg);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      border-color: var(--border-glass);
      transform: translateY(-1px);
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }

    .logo-mark {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px rgba(99, 102, 241, 0.35);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-tag {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .header-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    .voice-status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      backdrop-filter: blur(12px);
      animation: fadeIn 0.2s ease-out;
    }

    .voice-status-pill.listening {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.35);
      color: #fda4af;
      box-shadow: 0 0 15px rgba(244, 63, 94, 0.2);
    }

    .voice-status-pill.processing {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #a5b4fc;
    }

    .voice-status-pill.success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #6ee7b7;
    }

    .voice-status-pill.error {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fde68a;
    }

    .recording-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f43f5e;
      animation: pulse 1s infinite;
    }

    .voice-status-pill.speaking {
      background: rgba(99, 102, 241, 0.2);
      border-color: rgba(99, 102, 241, 0.45);
      color: #c7d2fe;
      cursor: pointer;
      max-width: 450px;
    }

    .soundwave-indicator {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 14px;
    }

    .wave-bar {
      width: 3px;
      height: 100%;
      background: #818cf8;
      border-radius: 2px;
      animation: soundWave 0.8s ease-in-out infinite alternate;
    }

    .bar-1 { animation-delay: 0.1s; height: 8px; }
    .bar-2 { animation-delay: 0.3s; height: 14px; }
    .bar-3 { animation-delay: 0.5s; height: 10px; }
    .bar-4 { animation-delay: 0.2s; height: 12px; }

    @keyframes soundWave {
      0% { transform: scaleY(0.3); }
      100% { transform: scaleY(1); }
    }

    .spinner-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #818cf8;
      animation: pulse 0.6s infinite alternate;
    }

    .checkmark {
      font-weight: 700;
      color: #10b981;
    }

    .err-icon {
      font-weight: 700;
      color: #f59e0b;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .settings-btn:hover {
      color: #818cf8;
      border-color: rgba(99, 102, 241, 0.3);
    }

    .voice-btn {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-glass);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .voice-btn:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--accent-primary);
      color: #818cf8;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
    }

    .voice-btn.active-recording {
      background: rgba(244, 63, 94, 0.2);
      border-color: var(--accent-rose);
      color: #fda4af;
      box-shadow: 0 0 16px rgba(244, 63, 94, 0.35);
    }

    .recording-pulse {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background: #f43f5e;
      border-radius: 50%;
      box-shadow: 0 0 6px #f43f5e;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HeaderComponent {
  datasetService = inject(DatasetService);
  voice = inject(VoiceService);

  isMenuOpen = signal(false);
  isSettingsOpen = signal(false);

  voiceState = signal<"idle" | "listening" | "processing" | "success" | "error">("idle");
  voiceSuccessText = signal<string>("Dashboard updated");
  voiceErrorText = signal<string>("Could not understand command");

  @Output() menuAction = new EventEmitter<string>();

  handleVoiceClick() {
    if (this.voiceState() === "listening") {
      this.voice.stopListening();
      const transcript = this.voice.transcript();
      if (transcript) {
        this.processVoiceCommand(transcript);
      } else {
        this.voiceState.set("idle");
      }
    } else {
      const started = this.voice.startListening();
      if (started) {
        this.voiceState.set("listening");
        const checkDone = setInterval(() => {
          if (!this.voice.isListening()) {
            clearInterval(checkDone);
            const transcript = this.voice.transcript();
            if (transcript) {
              this.processVoiceCommand(transcript);
            } else {
              this.voiceState.set("idle");
            }
          }
        }, 300);
      } else {
        this.voiceState.set("error");
        this.voiceErrorText.set("Microphone not available");
        setTimeout(() => this.voiceState.set("idle"), 3000);
      }
    }
  }

  processVoiceCommand(cmd: string) {
    this.voiceState.set("processing");
    this.datasetService.executeCommand(cmd).subscribe({
      next: (res) => {
        this.voiceState.set("success");
        const actionSummary = res.action_summary || "Dashboard updated according to your intent.";
        this.voiceSuccessText.set(actionSummary);
        // Explicit user requirement: respond clearly with "Okay, now I understand your vision."
        this.voice.speakVisionConfirmation(actionSummary);
        setTimeout(() => this.voiceState.set("idle"), 4000);
      },
      error: () => {
        this.voiceState.set("error");
        this.voiceErrorText.set("Could not execute command");
        this.voice.speak("I could not complete that request. Please verify your command.");
        setTimeout(() => this.voiceState.set("idle"), 3000);
      }
    });
  }

  handleMenuAction(act: string) {
    this.menuAction.emit(act);
  }
}
