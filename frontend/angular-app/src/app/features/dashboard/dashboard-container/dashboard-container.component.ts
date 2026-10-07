import { Component, ElementRef, ViewChild, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DatasetService } from "../../../core/services/dataset.service";
import { KpiCardComponent } from "../../../shared/components/kpi-card/kpi-card.component";
import { ChartCardComponent } from "../../../shared/components/chart-card/chart-card.component";
import { Visualization } from "../../../core/models/dashboard.model";

@Component({
  selector: "app-dashboard-container",
  standalone: true,
  imports: [CommonModule, KpiCardComponent, ChartCardComponent],
  template: `
    <div class="dashboard-wrapper">
      <!-- 1. AI Analysis Experience (Requirement 41) -->
      @if (datasetService.isAnalyzing()) {
        <div class="ai-pipeline-modal glass-panel">
          <div class="pipeline-header">
            <div class="pulsing-orb"></div>
            <div>
              <h2 class="pipeline-title">DataMorph Autonomous Intelligence</h2>
              <p class="pipeline-sub">Understanding dataset topology and synthesizing adaptive views...</p>
            </div>
          </div>

          <div class="pipeline-steps">
            @for (step of datasetService.aiPipelineSteps(); track step.id; let i = $index) {
              <div
                class="pipeline-step-item"
                [class.done]="step.status === 'done'"
                [class.active]="step.status === 'active'"
                [class.pending]="step.status === 'pending'"
              >
                <div class="step-icon">
                  @if (step.status === 'done') {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  } @else if (step.status === 'active') {
                    <span class="active-dot"></span>
                  } @else {
                    <span class="step-num">{{ i + 1 }}</span>
                  }
                </div>
                <span class="step-label">{{ step.label }}</span>
                @if (step.status === 'done') {
                  <span class="step-check">✓</span>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Explicit Error Recovery Banner -->
      @if (datasetService.pipelineError(); as err) {
        <div class="pipeline-error-card glass-card">
          <div class="error-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="error-content">
            <h3 class="error-title">Autonomous Pipeline Notice</h3>
            <p class="error-detail">{{ err }}</p>
          </div>
          <div class="error-actions">
            <button class="btn btn-primary btn-sm" (click)="datasetService.retryCurrentAnalysis()">
              Retry Pipeline
            </button>
            <button class="btn btn-subtle btn-sm" (click)="datasetService.pipelineError.set(null)">
              Dismiss
            </button>
          </div>
        </div>
      }

      <!-- 2. Active Dashboard Canvas -->
      @if (datasetService.activeDashboard(); as dash) {
        <!-- Dashboard Sub-Header -->
        <div class="dash-meta-strip glass-card">
          <div class="meta-left">
            @if (activeSection(); as sec) {
              @if (sec.id !== 'main') {
                <div class="section-indicator">
                  <span class="domain-pill">Domain: {{ sec.title }}</span>
                </div>
              }
            }
            <h1 class="dash-title">
              {{ isMainSection() ? dash.title : currentSectionTitle() }}
            </h1>
            <p class="dash-desc">
              {{ isMainSection() ? dash.description : currentSectionDescription() }}
            </p>
          </div>

          <div class="meta-right">
            <!-- Active Filters Indicator -->
            @if (dash.active_filters && getFilterKeys(dash.active_filters).length > 0) {
              <div class="active-filter-pill">
                <span>Filtered:</span>
                @for (key of getFilterKeys(dash.active_filters); track key) {
                  <strong>{{ key }} = {{ dash.active_filters[key] }}</strong>
                }
                <button class="clear-filter-btn" (click)="resetFilters()" title="Reset Filters">✕</button>
              </div>
            }

            <div class="dataset-tag">
              <span>{{ dash.dataset_filename }}</span>
              <span class="dot-separator">•</span>
              <span>{{ dash.total_rows | number }} rows</span>
            </div>
          </div>
        </div>

        <!-- 1. KPI Cards Row (Visible on Main Dashboard or when section has KPIs) -->
        @if (isMainSection() && dash.kpis && dash.kpis.length > 0) {
          <div class="kpis-grid">
            @for (kpi of dash.kpis; track kpi.id) {
              <app-kpi-card [kpi]="kpi"></app-kpi-card>
            }
          </div>
        }

        <!-- 2. Cross-Filter Bar -->
        @if (isMainSection() && dash.filters && dash.filters.length > 0) {
          <div class="filters-bar glass-card">
            <div class="filter-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Quick Filters:</span>
            </div>

            <div class="filter-chips">
              @for (f of dash.filters; track f.id) {
                @if (f.options && f.options.length > 0) {
                  <div class="filter-group">
                    <span class="group-label">{{ f.label }}:</span>
                    @for (opt of f.options.slice(0, 4); track opt) {
                      <button
                        class="filter-chip"
                        [class.active]="dash.active_filters?.[f.column_name] === opt"
                        (click)="applyFilter(f.column_name, opt)"
                      >
                        {{ opt }}
                      </button>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- 3. Adaptive Visualizations Grid (Filtered by Active Domain Section) -->
        <div class="charts-grid">
          @for (viz of filteredVisualizations(); track viz.id) {
            <div
              class="chart-grid-item"
              [class.col-span-2]="viz.col_span === 2"
            >
              <app-chart-card [viz]="viz"></app-chart-card>
            </div>
          }
        </div>

        @if (filteredVisualizations().length === 0) {
          <div class="empty-section-notice glass-card">
            <p>No specialized charts assigned to this analytical section yet.</p>
            <button class="btn btn-subtle" (click)="datasetService.setActiveSection('main')">
              Return to Main Dashboard
            </button>
          </div>
        }

      } @else if (!datasetService.isLoading() && !datasetService.isAnalyzing()) {
        <!-- 3. Clean Initial / Empty UI (Requirement 40) -->
        <div class="empty-dashboard glass-panel">
          <div class="empty-hero">
            <div class="hero-icon-ring">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 class="hero-title">Upload your data and let DataMorph understand it.</h2>
            <p class="hero-subtitle">
              Autonomous schema profiling, semantic domain detection, explainable recommendation ranking, and dynamic dashboard synthesis.
            </p>
          </div>

          <!-- Clean Drag & Drop Zone: Strictly CSV and XLSX (Requirement 35) -->
          <label class="clean-dropzone glass-card">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              (change)="onFileSelected($event)"
              hidden
            />
            <div class="drop-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <span class="drop-text">Drag & drop CSV or XLSX file</span>
            <span class="drop-sub">or click to browse your local filesystem</span>
            <div class="format-tags">
              <span class="tag">CSV</span>
              <span class="tag">XLSX</span>
              <span class="tag">XLS</span>
            </div>
          </label>

          <!-- Subtle Demo Links (Requirement 40: Optional, do not dominate) -->
          <div class="sample-links-tray">
            <span class="sample-tray-label">Or explore with sample data:</span>
            <div class="sample-links">
              <button class="sample-link" (click)="loadDemoDataset('students.csv')">
                Student Records
              </button>
              <span class="divider">/</span>
              <button class="sample-link" (click)="loadDemoDataset('sales.csv')">
                Sales Pipeline
              </button>
              <span class="divider">/</span>
              <button class="sample-link" (click)="loadDemoDataset('weather_timeseries.csv')">
                Weather Station
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
    }

    /* Error Notification Banner */
    .pipeline-error-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: var(--radius-md);
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.35);
      animation: fadeIn 0.2s ease-out;
    }

    .error-icon-box {
      color: #fb7185;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .error-content {
      flex: 1;
    }

    .error-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fda4af;
      margin-bottom: 2px;
    }

    .error-detail {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .error-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
    }

    /* Requirement 41: Progressive AI Pipeline */
    .ai-pipeline-modal {
      padding: 32px 36px;
      border-radius: var(--radius-lg);
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(99, 102, 241, 0.35);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      margin-bottom: 24px;
      animation: fadeIn 0.25s ease-out;
    }

    .pipeline-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .pulsing-orb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #818cf8;
      box-shadow: 0 0 20px #818cf8;
      animation: pulse 1.4s infinite;
    }

    .pipeline-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
    }

    .pipeline-sub {
      font-size: 0.825rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .pipeline-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .pipeline-step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.3s;
    }

    .pipeline-step-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
    }

    .pipeline-step-item.done {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .pipeline-step-item.pending {
      color: var(--text-muted);
      opacity: 0.6;
    }

    .step-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .pipeline-step-item.done .step-icon {
      background: #10b981;
      color: #fff;
    }

    .pipeline-step-item.active .step-icon {
      background: #6366f1;
      color: #fff;
    }

    .active-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fff;
      animation: pulse 1s infinite;
    }

    .step-label {
      font-size: 0.8rem;
      font-weight: 500;
      flex: 1;
    }

    .step-check {
      font-size: 0.9rem;
      font-weight: 800;
      color: #10b981;
    }

    /* Dashboard Sub-Header */
    .dash-meta-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-radius: var(--radius-lg);
    }

    .section-indicator {
      margin-bottom: 4px;
    }

    .domain-pill {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }

    .dash-title {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }

    .dash-desc {
      font-size: 0.825rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .meta-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .active-filter-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.775rem;
    }

    .clear-filter-btn {
      background: transparent;
      border: none;
      color: #fda4af;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .dataset-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.775rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .dot-separator {
      opacity: 0.4;
    }

    .kpis-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 1100px) {
      .kpis-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .kpis-grid {
        grid-template-columns: 1fr;
      }
    }

    .filters-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 18px;
      overflow-x: auto;
    }

    .filter-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .filter-chips {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .group-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .filter-chip {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .filter-chip.active {
      background: rgba(99, 102, 241, 0.2);
      border-color: var(--accent-primary);
      color: #818cf8;
      font-weight: 600;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      align-items: stretch;
    }

    .chart-grid-item.col-span-2 {
      grid-column: span 2;
    }

    .chart-grid-item.col-span-3 {
      grid-column: span 3;
    }

    @media (max-width: 1200px) {
      .charts-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .chart-grid-item.col-span-2 {
        grid-column: span 2;
      }
    }

    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      .chart-grid-item.col-span-2,
      .chart-grid-item.col-span-3 {
        grid-column: span 1;
      }
    }

    .empty-section-notice {
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .btn-subtle {
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.8rem;
    }

    /* Clean Initial / Empty State UI (Requirement 40) */
    .empty-dashboard {
      padding: 64px 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
      max-width: 760px;
      margin: 40px auto;
      border-radius: var(--radius-xl);
    }

    .empty-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .hero-icon-ring {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.2);
    }

    .hero-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      max-width: 540px;
      color: var(--text-muted);
      font-size: 0.925rem;
      line-height: 1.5;
    }

    .clean-dropzone {
      width: 100%;
      max-width: 520px;
      padding: 36px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      border: 2px dashed rgba(99, 102, 241, 0.35);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all 0.25s;
    }

    .clean-dropzone:hover {
      border-color: #818cf8;
      background: rgba(99, 102, 241, 0.08);
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.15);
    }

    .drop-icon {
      color: #818cf8;
      opacity: 0.9;
    }

    .drop-text {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .drop-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .format-tags {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .format-tags .tag {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
    }

    .sample-links-tray {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .sample-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sample-link {
      background: transparent;
      border: none;
      color: #818cf8;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .sample-link:hover {
      color: #a5b4fc;
    }

    .divider {
      opacity: 0.3;
    }
  `]
})
export class DashboardContainerComponent {
  datasetService = inject(DatasetService);

  isMainSection(): boolean {
    return this.datasetService.activeSectionId() === "main";
  }

  activeSection() {
    const dash = this.datasetService.activeDashboard();
    if (!dash || !dash.navigation_sections) return null;
    return dash.navigation_sections.find((s) => s.id === this.datasetService.activeSectionId());
  }

  currentSectionTitle(): string {
    const sec = this.activeSection();
    return sec ? sec.title : "Analytical Domain";
  }

  currentSectionDescription(): string {
    const sec = this.activeSection();
    return sec ? (sec.description || "Contextual domain visual metrics") : "";
  }

  // Filter visualizations by the currently selected dynamic section
  filteredVisualizations(): Visualization[] {
    const dash = this.datasetService.activeDashboard();
    if (!dash) return [];

    const sectionId = this.datasetService.activeSectionId();
    if (sectionId === "main") {
      return dash.visualizations;
    }

    const sec = this.activeSection();
    if (!sec) return dash.visualizations;

    // Return visualizations belonging to this domain or matching its columns
    const matched = dash.visualizations.filter((v) => {
      if (v.domain_id === sectionId) return true;
      if (sec.columns) {
        return sec.columns.includes(v.x_axis) || sec.columns.includes(v.y_axis);
      }
      return false;
    });

    return matched.length > 0 ? matched : dash.visualizations;
  }

  getFilterKeys(filters: Record<string, any>): string[] {
    return Object.keys(filters || {});
  }

  applyFilter(column: string, value: string) {
    this.datasetService.executeCommand(`filter ${column} to ${value}`).subscribe();
  }

  resetFilters() {
    this.datasetService.executeCommand("reset dashboard filters").subscribe();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.datasetService.uploadDataset(input.files[0]).subscribe();
    }
  }

  loadDemoDataset(filename: string) {
    fetch(`/datasets/samples/${filename}`)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], filename, { type: "text/csv" });
        this.datasetService.uploadDataset(file).subscribe();
      })
      .catch(() => {
        // Synthesize fallback sample if static asset not served
        const synthetic = new File(
          ["StudentID,Name,Department,Attendance,InternalMarks,Grade\n1,Alice,CSE,85,92,A\n2,Bob,ECE,72,68,B\n3,Charlie,ME,90,88,A\n4,Diana,CSE,65,58,C\n5,Ethan,ECE,88,85,A"],
          filename,
          { type: "text/csv" }
        );
        this.datasetService.uploadDataset(synthetic).subscribe();
      });
  }
}

