import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-app-menu",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="menu-backdrop" (click)="close.emit()">
        <div class="menu-drawer glass-panel" (click)="$event.stopPropagation()">
          <div class="menu-header">
            <div class="menu-title-group">
              <div class="menu-logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h3 class="menu-title">DataMorph</h3>
                <span class="menu-subtitle">Application Menu</span>
              </div>
            </div>
            <button class="close-btn" (click)="close.emit()" title="Close menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="menu-items">
            <button class="menu-item active" (click)="selectAction('home')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
              <span>Home Workspace</span>
            </button>

            <button class="menu-item" (click)="selectAction('datasets')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
              </svg>
              <span>Datasets Library</span>
            </button>

            <button class="menu-item" (click)="selectAction('saved')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span>Saved Dashboards</span>
            </button>

            <button class="menu-item" (click)="selectAction('history')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Recent Analysis</span>
            </button>

            <div class="menu-divider"></div>

            <button class="menu-item" (click)="selectAction('help')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Help & Architecture</span>
            </button>

            <button class="menu-item" (click)="selectAction('about')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>About DataMorph</span>
            </button>
          </div>

          <div class="menu-footer">
            <span class="system-tag">Local Intelligence Core v2.0</span>
            <span class="copyright">Zero External Cloud Telemetry</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .menu-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .menu-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 320px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      background: rgba(11, 17, 32, 0.95);
      border-right: 1px solid var(--border-glass);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
      animation: slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .menu-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .menu-logo-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .menu-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .menu-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .menu-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 24px;
      flex: 1;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      width: 100%;
      text-align: left;
    }

    .menu-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      border-color: var(--border-subtle);
      transform: translateX(3px);
    }

    .menu-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.35);
      color: #818cf8;
    }

    .menu-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 12px 0;
    }

    .menu-footer {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
    }

    .system-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent-cyan);
    }

    .copyright {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    @keyframes slideRight {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class AppMenuComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<string>();

  selectAction(act: string) {
    this.action.emit(act);
    this.close.emit();
  }
}
