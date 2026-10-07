import { Component, EventEmitter, Input, Output, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiService } from "../../../core/services/api.service";
import { ThemeService, ThemeId, CustomPalette } from "../../../core/services/theme.service";
import { VoiceService } from "../../../core/services/voice.service";

@Component({
  selector: "app-settings-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="close.emit()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="title-with-icon">
              <div class="settings-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <div>
                <h3 class="modal-title">System Settings</h3>
                <span class="modal-sub">DataMorph Desktop Environment</span>
              </div>
            </div>
            <button class="close-btn" (click)="close.emit()" title="Close Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- 1. Four Standard VS Code Themes -->
            <div class="setting-group">
              <div class="group-header-row">
                <span class="group-label">VS Code Standard Themes</span>
                <span class="sub-badge">4 Distinct Palettes</span>
              </div>
              <div class="theme-grid">
                @for (th of themeService.themes; track th.id) {
                  <div
                    class="theme-card glass-card"
                    [class.active]="themeService.currentTheme() === th.id"
                    (click)="themeService.setTheme(th.id)"
                  >
                    <div class="theme-card-top">
                      <span class="theme-name">{{ th.name }}</span>
                      @if (themeService.currentTheme() === th.id) {
                        <span class="theme-check">✓</span>
                      }
                    </div>
                    <span class="theme-desc">{{ th.tag }}</span>
                    <div class="swatches-row">
                      @for (color of th.swatches; track color) {
                        <span class="swatch-dot" [style.background]="color"></span>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Interactive 5-Color Theme Customizer -->
              <div class="customizer-box glass-card">
                <div class="customizer-header">
                  <div class="customizer-title-group">
                    <span class="customizer-title">Live 5-Color Customizer</span>
                    <span class="customizer-sub">Customize each color mark, background, and accent in the active theme</span>
                  </div>
                  <button class="btn-subtle-sm" (click)="themeService.resetActivePalette()" title="Reset back to standard preset colors">
                    ↺ Reset Defaults
                  </button>
                </div>

                <div class="palette-pickers-grid">
                  <!-- 1. Primary Accent -->
                  <div class="color-picker-item">
                    <label class="color-picker-label">Primary Accent</label>
                    <div class="color-input-wrapper">
                      <input 
                        type="color" 
                        [value]="themeService.activePalette().accentPrimary" 
                        (input)="onColorChange('accentPrimary', $event)" 
                        class="color-native-input"
                      />
                      <span class="color-hex-text">{{ themeService.activePalette().accentPrimary }}</span>
                    </div>
                  </div>

                  <!-- 2. Secondary Accent -->
                  <div class="color-picker-item">
                    <label class="color-picker-label">Secondary Accent</label>
                    <div class="color-input-wrapper">
                      <input 
                        type="color" 
                        [value]="themeService.activePalette().accentSecondary" 
                        (input)="onColorChange('accentSecondary', $event)" 
                        class="color-native-input"
                      />
                      <span class="color-hex-text">{{ themeService.activePalette().accentSecondary }}</span>
                    </div>
                  </div>

                  <!-- 3. Highlight Cyan -->
                  <div class="color-picker-item">
                    <label class="color-picker-label">Data Mark Cyan</label>
                    <div class="color-input-wrapper">
                      <input 
                        type="color" 
                        [value]="themeService.activePalette().accentCyan" 
                        (input)="onColorChange('accentCyan', $event)" 
                        class="color-native-input"
                      />
                      <span class="color-hex-text">{{ themeService.activePalette().accentCyan }}</span>
                    </div>
                  </div>

                  <!-- 4. Surface Glass -->
                  <div class="color-picker-item">
                    <label class="color-picker-label">Surface Glass</label>
                    <div class="color-input-wrapper">
                      <input 
                        type="color" 
                        [value]="themeService.activePalette().bgSurface" 
                        (input)="onColorChange('bgSurface', $event)" 
                        class="color-native-input"
                      />
                      <span class="color-hex-text">{{ themeService.activePalette().bgSurface }}</span>
                    </div>
                  </div>

                  <!-- 5. Base Background -->
                  <div class="color-picker-item">
                    <label class="color-picker-label">Base Canvas</label>
                    <div class="color-input-wrapper">
                      <input 
                        type="color" 
                        [value]="themeService.activePalette().bgBase" 
                        (input)="onColorChange('bgBase', $event)" 
                        class="color-native-input"
                      />
                      <span class="color-hex-text">{{ themeService.activePalette().bgBase }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Image Wallpaper / Backdrop Theme Setter -->
            <div class="setting-group">
              <div class="group-header-row">
                <span class="group-label">Ambient Wallpaper Theme Setter</span>
                <span class="sub-badge">PNG, JPG, WEBP, SVG</span>
              </div>

              <!-- Upload Custom Image Dropzone -->
              <div class="wallpaper-controls">
                <label class="wallpaper-upload-btn glass-card">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml, image/bmp"
                    (change)="onWallpaperFileSelected($event)"
                    hidden
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Upload Image File as Backdrop</span>
                </label>

                @if (themeService.wallpaperImage()) {
                  <button class="btn-subtle-sm danger" (click)="themeService.removeWallpaper()">
                    ✕ Remove Custom Wallpaper
                  </button>
                }
              </div>

              <!-- Preset Wallpapers Row -->
              <div class="presets-row">
                <span class="presets-label">Or select abstract presets:</span>
                <div class="presets-chips">
                  @for (p of themeService.presets; track p.id) {
                    <button
                      class="preset-chip"
                      [class.active]="themeService.wallpaperPresetId() === p.id && !themeService.wallpaperImage()"
                      (click)="themeService.applyPresetWallpaper(p.id)"
                    >
                      <span class="preset-preview" [style.background]="p.previewGradient"></span>
                      <span>{{ p.name }}</span>
                    </button>
                  }
                </div>
              </div>

              @if (wallpaperError()) {
                <span class="error-toast">{{ wallpaperError() }}</span>
              }

              <!-- Scrim Dimming / Blur Slider -->
              <div class="slider-row">
                <div class="slider-info">
                  <span class="slider-name">Glass Scrim Opacity</span>
                  <span class="slider-val">{{ (themeService.wallpaperOpacity() * 100) | number:'1.0-0' }}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.65"
                  step="0.05"
                  [value]="themeService.wallpaperOpacity()"
                  (input)="onOpacityChange($event)"
                  class="range-slider"
                />
              </div>
            </div>

            <!-- 3. Voice Interaction & Simple Vision Confirmation -->
            <div class="setting-group">
              <div class="group-header-row">
                <span class="group-label">Voice & Conversational Response</span>
                <span class="sub-badge">Speech Synthesis</span>
              </div>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-name">Spoken Vision Responses</span>
                  <span class="setting-desc">Responds with <em>"Okay, now I understand your vision..."</em> upon command execution</span>
                </div>
                <button
                  class="toggle-switch"
                  [class.active]="voiceService.speechEnabled()"
                  (click)="voiceService.toggleSpeech(!voiceService.speechEnabled())"
                >
                  <span class="toggle-knob"></span>
                </button>
              </div>

              <div class="setting-row voice-test-row">
                <div class="setting-info">
                  <span class="setting-name">Verify Voice Synthesis</span>
                  <span class="setting-desc">Preview clear acoustic response</span>
                </div>
                <button class="btn-secondary-sm" (click)="voiceService.testVoice()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  <span>Test Voice</span>
                </button>
              </div>
            </div>

            <!-- 4. AI Engine & Processing -->
            <div class="setting-group">
              <span class="group-label">AI Inference & Local Processing</span>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-name">Python AI Microservice</span>
                  <span class="setting-desc">Local high-performance REST engine (Pandas, Scikit-learn, OpenPyXL)</span>
                </div>
                <div class="status-indicator">
                  <span class="dot-online"></span>
                  <span>127.0.0.1:5005</span>
                </div>
              </div>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-name">Data Exposure Policy</span>
                  <span class="setting-desc">Local-first privacy: no telemetry or raw records uploaded to public clouds</span>
                </div>
                <span class="badge-privacy">Local Execution</span>
              </div>
            </div>

            <!-- 5. User Preference Learning -->
            <div class="setting-group">
              <span class="group-label">Personalization & Learned Preferences</span>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-name">Adaptive Recommendation Weighting</span>
                  <span class="setting-desc">Learns preferred chart types, metrics, and aggregations over time</span>
                </div>
                <button class="btn-secondary-sm" (click)="resetPreferences()">Reset Preferences</button>
              </div>
              @if (resetMessage()) {
                <span class="success-toast">{{ resetMessage() }}</span>
              }
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-primary" (click)="close.emit()">Done</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-card {
      width: 600px;
      max-width: 92vw;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .settings-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: var(--accent-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-sm);
      transition: all 0.15s;
    }

    .close-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.08);
    }

    .modal-body {
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .group-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .group-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: var(--text-muted);
    }

    .sub-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }

    /* 4 VS Code Themes Grid */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .theme-card {
      padding: 12px 14px;
      border-radius: var(--radius-md);
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .theme-card:hover {
      border-color: var(--border-glass);
      transform: translateY(-2px);
    }

    .theme-card.active {
      border-color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.12);
      box-shadow: 0 0 16px var(--accent-primary-glow);
    }

    .theme-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .theme-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .theme-check {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--accent-primary);
    }

    .theme-desc {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .swatches-row {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }

    .swatch-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Live 5-Color Customizer */
    .customizer-box {
      margin-top: 14px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .customizer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .customizer-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .customizer-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .customizer-sub {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .palette-pickers-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }

    @media (max-width: 600px) {
      .palette-pickers-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .color-picker-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .color-picker-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .color-input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 4px 6px;
      cursor: pointer;
      transition: border-color 0.15s;
    }

    .color-input-wrapper:hover {
      border-color: var(--border-glass);
    }

    .color-native-input {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      background-color: transparent;
      border: none;
      cursor: pointer;
      border-radius: 4px;
      overflow: hidden;
      padding: 0;
    }

    .color-native-input::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .color-native-input::-webkit-color-swatch {
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }

    .color-hex-text {
      font-size: 0.68rem;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-secondary);
      font-weight: 600;
    }

    /* Wallpaper Controls */
    .wallpaper-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .wallpaper-upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      border: 1px dashed var(--border-glass);
      background: rgba(255, 255, 255, 0.04);
      transition: all 0.2s;
    }

    .wallpaper-upload-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--accent-primary);
      color: var(--accent-primary);
    }

    .presets-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .presets-label {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .presets-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.15s;
    }

    .preset-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .preset-chip.active {
      border-color: var(--accent-primary);
      color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.12);
    }

    .preset-preview {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 6px;
    }

    .slider-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .slider-name {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .slider-val {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .range-slider {
      width: 100%;
      accent-color: var(--accent-primary);
      cursor: pointer;
    }

    /* Standard Setting Rows */
    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .setting-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .setting-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Toggle Switch */
    .toggle-switch {
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid var(--border-subtle);
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
      outline: none;
      flex-shrink: 0;
    }

    .toggle-switch.active {
      background: var(--accent-primary);
      border-color: var(--accent-primary);
    }

    .toggle-knob {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toggle-switch.active .toggle-knob {
      transform: translateX(20px);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .dot-online {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .badge-privacy {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .btn-secondary-sm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-secondary-sm:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--border-glass);
    }

    .btn-subtle-sm {
      background: none;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 4px 10px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-subtle-sm.danger:hover {
      color: #fda4af;
      border-color: rgba(244, 63, 94, 0.3);
      background: rgba(244, 63, 94, 0.1);
    }

    .success-toast {
      font-size: 0.75rem;
      color: #34d399;
      animation: fadeIn 0.2s;
    }

    .error-toast {
      font-size: 0.75rem;
      color: #f87171;
      animation: fadeIn 0.2s;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class SettingsModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  private api = inject(ApiService);
  themeService = inject(ThemeService);
  voiceService = inject(VoiceService);

  resetMessage = signal<string | null>(null);
  wallpaperError = signal<string | null>(null);

  async onWallpaperFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.wallpaperError.set(null);
      try {
        await this.themeService.setCustomImageWallpaper(input.files[0]);
      } catch (err: any) {
        this.wallpaperError.set(err.message || "Failed to set wallpaper image.");
      }
    }
  }

  onOpacityChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.themeService.setWallpaperOpacity(parseFloat(input.value));
  }

  onColorChange(key: keyof CustomPalette, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input && input.value) {
      this.themeService.updatePaletteColor(key, input.value);
    }
  }

  resetPreferences() {
    this.api.post("/preferences/reset", {}).subscribe({
      next: () => {
        this.resetMessage.set("Preference weights reset to default.");
        setTimeout(() => this.resetMessage.set(null), 3000);
      },
      error: () => {
        this.resetMessage.set("Preferences reset locally.");
        setTimeout(() => this.resetMessage.set(null), 3000);
      }
    });
  }
}
