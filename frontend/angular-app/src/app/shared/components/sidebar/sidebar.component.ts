import { Component, ElementRef, ViewChild, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DatasetService } from "../../../core/services/dataset.service";
import { NavigationSection } from "../../../core/models/dashboard.model";

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="app-sidebar glass-panel">
      <!-- 1. Top Section: Main Executive Dashboard -->
      <div class="nav-section">
        <span class="nav-section-title">Navigation</span>
        
        <button
          class="nav-item main-dash-item"
          [class.active]="datasetService.activeSectionId() === 'main'"
          (click)="datasetService.setActiveSection('main')"
          title="Executive Overview"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="7" height="9" x="3" y="3" rx="1"></rect>
            <rect width="7" height="5" x="14" y="3" rx="1"></rect>
            <rect width="7" height="9" x="14" y="12" rx="1"></rect>
            <rect width="7" height="5" x="3" y="16" rx="1"></rect>
          </svg>
          <span class="item-text">Main Dashboard</span>
        </button>
      </div>

      <!-- 2. Dynamic Semantic Analytical Sections (AI Generated from Dataset) -->
      <div class="nav-section dynamic-sections-container">
        <div class="section-title-row">
          <span class="nav-section-title">Analytical Domains</span>
          @if (analyticalSections().length > 0) {
            <span class="ai-tag">AI Generated</span>
          }
        </div>

        <div class="sections-list">
          @if (analyticalSections().length > 0) {
            @for (s of analyticalSections(); track s.id) {
              <button
                class="nav-item domain-item"
                [class.active]="datasetService.activeSectionId() === s.id"
                (click)="datasetService.setActiveSection(s.id)"
                [title]="s.description || s.title"
              >
                <!-- Semantic Icon based on section title/icon -->
                <div class="domain-icon-slot">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    @if (s.title.toLowerCase().includes('attendance') || s.title.toLowerCase().includes('engagement')) {
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    } @else if (s.title.toLowerCase().includes('academic') || s.title.toLowerCase().includes('performance') || s.title.toLowerCase().includes('grade')) {
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    } @else if (s.title.toLowerCase().includes('revenue') || s.title.toLowerCase().includes('sales') || s.title.toLowerCase().includes('profit')) {
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                      <polyline points="17 6 23 6 23 12"></polyline>
                    } @else if (s.title.toLowerCase().includes('weather') || s.title.toLowerCase().includes('temp') || s.title.toLowerCase().includes('atmosphere')) {
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    } @else {
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    }
                  </svg>
                </div>

                <span class="domain-title">{{ s.title }}</span>

                @if (s.metric_count) {
                  <span class="count-badge">{{ s.metric_count }}</span>
                }
              </button>
            }
          } @else if (datasetService.activeDataset()) {
            <div class="loading-domains">
              <span class="dot-pulse"></span>
              <span>Clustering domains...</span>
            </div>
          } @else {
            <div class="empty-domains-notice">
              <p>Upload a dataset to generate context-tailored analytical views.</p>
            </div>
          }
        </div>
      </div>

      <!-- 3. Minimal Dataset Control (Requirement 31) -->
      <div class="dataset-control-dock">
        @if (datasetService.activeDataset(); as ds) {
          <div class="dataset-card">
            <div class="dataset-info">
              <div class="file-badge">
                {{ getFileType(ds.filename) }}
              </div>

              <div class="file-text">
                <span class="file-name" [title]="ds.filename">{{ ds.filename }}</span>
                <span class="file-meta">
                  {{ ds.row_count ? (ds.row_count | number) + ' rows' : 'Connected' }}
                </span>
              </div>
            </div>

            <!-- Minimal ⋮ Action Menu Trigger -->
            <div class="action-dropdown-wrapper">
              <button
                class="dots-btn"
                (click)="isMenuOpen.set(!isMenuOpen())"
                title="Dataset Options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="5" r="1.5"></circle>
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="12" cy="19" r="1.5"></circle>
                </svg>
              </button>

              @if (isMenuOpen()) {
                <div class="dropdown-menu glass-panel" (click)="$event.stopPropagation()">
                  <button class="dropdown-item" (click)="triggerFileInput()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Change Data</span>
                  </button>

                  <button class="dropdown-item" (click)="refreshData()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    <span>Refresh Data</span>
                  </button>

                  <div class="dropdown-divider"></div>

                  <button class="dropdown-item danger" (click)="removeData()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Remove Dataset</span>
                  </button>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Connect Data Button when no active dataset -->
          <button class="connect-data-btn" (click)="triggerFileInput()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Connect Dataset</span>
          </button>
        }

        <!-- Hidden Native File Input: Strictly CSV, XLSX, and XLS -->
        <input
          #fileInput
          type="file"
          accept=".csv,.xlsx,.xls"
          (change)="onFileSelected($event)"
          hidden
        />
      </div>
    </aside>
  `,
  styles: [`
    .app-sidebar {
      width: 270px;
      height: calc(100vh - 100px);
      margin: 16px 0 20px 20px;
      padding: 18px 14px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .dynamic-sections-container {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      padding-right: 4px;
    }

    .dynamic-sections-container::-webkit-scrollbar {
      width: 4px;
    }

    .dynamic-sections-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px 6px 8px;
    }

    .nav-section-title {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 700;
    }

    .ai-tag {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      text-transform: uppercase;
    }

    .sections-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      width: 100%;
      text-align: left;
      position: relative;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      border-color: rgba(255, 255, 255, 0.06);
    }

    .nav-item.active {
      background: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.12);
    }

    .domain-icon-slot {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.85;
      flex-shrink: 0;
    }

    .domain-title {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .count-badge {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
    }

    .loading-domains {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .dot-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #818cf8;
      animation: pulse 1.4s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    .empty-domains-notice {
      padding: 14px 10px;
      font-size: 0.775rem;
      color: var(--text-muted);
      line-height: 1.4;
      background: rgba(255, 255, 255, 0.02);
      border-radius: var(--radius-sm);
      border: 1px dashed rgba(255, 255, 255, 0.06);
    }

    /* Minimal Dataset Control Dock (Section 31) */
    .dataset-control-dock {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
      position: relative;
    }

    .dataset-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .dataset-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .file-badge {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
      flex-shrink: 0;
    }

    .file-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .file-name {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .file-meta {
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .action-dropdown-wrapper {
      position: relative;
    }

    .dots-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dots-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .dropdown-menu {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      width: 170px;
      padding: 6px;
      border-radius: var(--radius-md);
      z-index: 100;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.15s ease-out;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: all 0.15s;
    }

    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .dropdown-item.danger {
      color: #f87171;
    }

    .dropdown-item.danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 4px 0;
    }

    .connect-data-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #a5b4fc;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .connect-data-btn:hover {
      background: rgba(99, 102, 241, 0.22);
      border-color: #818cf8;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
    }
  `]
})
export class SidebarComponent {
  datasetService = inject(DatasetService);
  isMenuOpen = signal<boolean>(false);

  @ViewChild("fileInput") fileInputRef!: ElementRef<HTMLInputElement>;

  getFileType(filename?: string): string {
    if (!filename) return "DATA";
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "DATA";
  }

  // Dynamically extract semantic analytical sections from active dashboard
  analyticalSections(): NavigationSection[] {

    const dash = this.datasetService.activeDashboard();
    if (!dash || !dash.navigation_sections) return [];
    // Filter out 'main' overview as it's pinned to the top
    return dash.navigation_sections.filter((s) => s.id !== "main");
  }

  triggerFileInput() {
    this.isMenuOpen.set(false);
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.datasetService.uploadDataset(input.files[0]).subscribe();
      input.value = ""; // Reset input
    }
  }

  refreshData() {
    this.isMenuOpen.set(false);
    this.datasetService.refreshActiveDataset();
  }

  removeData() {
    this.isMenuOpen.set(false);
    this.datasetService.removeActiveDataset();
  }
}

