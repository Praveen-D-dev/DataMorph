import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import * as echarts from "echarts";
import { Visualization } from "../../../core/models/dashboard.model";
import { DatasetService } from "../../../core/services/dataset.service";

@Component({
  selector: "app-chart-card",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="chart-card glass-card" 
      [class.editing-mode]="isEditing()"
      [style.background]="viz.card_bg_tint || ''"
      [style.borderTop]="'3px solid ' + (viz.accent_color || 'var(--accent-primary)')"
      [style.minHeight.px]="viz.card_height || 360"
    >
      <!-- Card Header -->
      <div class="chart-header">
        <div class="title-cluster">
          <span 
            class="chart-type-tag" 
            [class]="'tag-' + viz.chart_type"
            [style.color]="viz.accent_color || ''"
            [style.borderColor]="viz.accent_color ? (viz.accent_color + '55') : ''"
          >
            {{ viz.chart_type }}
          </span>
          <h3 class="chart-title" [title]="viz.title">{{ viz.title }}</h3>
          @if (viz.aggregation) {
            <span class="agg-badge">{{ viz.aggregation }}</span>
          }
        </div>

        <div class="chart-actions">
          <!-- Score Badge -->
          <div class="score-badge" title="AI Recommendation Fitness Score">
            <span>{{ (((viz.score || 0.88) * 100).toFixed(0)) }}% Match</span>
          </div>

          <!-- Explainability Button (💡) -->
          <button
            class="action-icon-btn"
            [class.active]="showReason"
            (click)="showReason = !showReason"
            title="Explain why this chart was selected"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>

          <!-- Minimal ⋮ Action Menu (Requirements 17 & 18) -->
          <div class="widget-menu-wrapper">
            <button
              class="action-icon-btn dots-btn"
              [class.active]="isMenuOpen()"
              (click)="isMenuOpen.set(!isMenuOpen())"
              title="Widget Actions (Edit, Change Visualization, Remove)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>

            @if (isMenuOpen()) {
              <div class="widget-dropdown glass-panel" (click)="$event.stopPropagation()">
                <div class="dropdown-header">Widget Controls</div>

                <button class="menu-action-btn" (click)="openEditModal()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>Edit Configuration</span>
                </button>

                <!-- Quick Chart Type Submenu -->
                <div class="quick-types-row">
                  <span class="sub-label">Type:</span>
                  <div class="type-pills">
                    @for (t of ['bar', 'line', 'area', 'scatter', 'pie']; track t) {
                      <button
                        class="type-pill"
                        [class.active]="viz.chart_type === t"
                        (click)="quickChangeType(t)"
                        [title]="'Change to ' + t"
                      >
                        {{ t }}
                      </button>
                    }
                  </div>
                </div>

                <button class="menu-action-btn" (click)="toggleWidth()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <line x1="12" y1="4" x2="12" y2="20"></line>
                  </svg>
                  <span>{{ viz.col_span === 2 ? 'Collapse to 1 Col' : 'Expand to Full Width' }}</span>
                </button>

                <button class="menu-action-btn" (click)="duplicate()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Duplicate Widget</span>
                </button>

                <div class="menu-divider"></div>

                <button class="menu-action-btn danger" (click)="remove()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Remove Widget</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Explainability Drawer (💡) -->
      @if (showReason) {
        <div class="explainability-drawer">
          <div class="reason-icon">💡</div>
          <div class="reason-text">
            <strong>Adaptive Rationale:</strong> {{ viz.reason }}
          </div>
        </div>
      }

      <!-- Inline Widget Editor Modal / Overlay (Requirement 18 & 19) -->
      @if (isEditing()) {
        <div class="inline-editor-overlay glass-panel">
          <div class="editor-header">
            <h4>Customize Widget</h4>
            <button class="close-editor-btn" (click)="isEditing.set(false)">✕</button>
          </div>

          <div class="editor-form">
            <div class="form-field">
              <label>Widget Title</label>
              <input type="text" [(ngModel)]="editForm.title" class="input-text" />
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Chart Type</label>
                <select [(ngModel)]="editForm.chart_type" class="input-select">
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="pie">Donut / Pie Chart</option>
                </select>
              </div>

              <div class="form-field">
                <label>Aggregation</label>
                <select [(ngModel)]="editForm.aggregation" class="input-select">
                  <option value="SUM">SUM</option>
                  <option value="AVG">AVERAGE</option>
                  <option value="COUNT">COUNT</option>
                  <option value="MIN">MIN</option>
                  <option value="MAX">MAX</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Dimension (X-Axis)</label>
                <select [(ngModel)]="editForm.x_axis" class="input-select">
                  @for (col of dimensionColumns(); track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>
              </div>

              <div class="form-field">
                <label>Metric (Y-Axis)</label>
                <select [(ngModel)]="editForm.y_axis" class="input-select">
                  @for (col of metricColumns(); track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="editor-actions">
              <button class="btn btn-secondary" (click)="isEditing.set(false)">Cancel</button>
              <button class="btn btn-primary" (click)="saveEditChanges()">Apply Changes</button>
            </div>
          </div>
        </div>
      }

      <!-- ECharts Canvas Container -->
      <div #chartContainer class="chart-canvas"></div>
    </div>
  `,
  styles: [`
    .chart-card {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 340px;
      position: relative;
      border-radius: var(--radius-lg);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .chart-card:hover {
      border-color: rgba(99, 102, 241, 0.3);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      position: relative;
      z-index: 10;
    }

    .title-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .chart-type-tag {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .tag-bar { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .tag-line { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
    .tag-pie { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
    .tag-scatter { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .tag-area { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .tag-box, .tag-boxplot { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .tag-heatmap { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }

    .agg-badge {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
    }

    .chart-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    .chart-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .score-badge {
      font-size: 0.7rem;
      font-weight: 600;
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 2px 7px;
      border-radius: 9999px;
    }

    .action-icon-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-icon-btn:hover, .action-icon-btn.active {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .widget-menu-wrapper {
      position: relative;
    }

    .widget-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 200px;
      padding: 8px;
      border-radius: var(--radius-md);
      z-index: 100;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.15s ease-out;
    }

    .dropdown-header {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      padding: 4px 8px 6px 8px;
    }

    .menu-action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
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

    .menu-action-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-primary);
    }

    .menu-action-btn.danger {
      color: #f87171;
    }

    .menu-action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }

    .quick-types-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
      margin: 4px 0;
    }

    .sub-label {
      font-size: 0.65rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .type-pill {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .type-pill:hover, .type-pill.active {
      background: rgba(99, 102, 241, 0.2);
      border-color: rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }

    .menu-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 6px 0;
    }

    .explainability-drawer {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-sm);
      margin-bottom: 8px;
      animation: fadeIn 0.2s ease-out;
      position: relative;
      z-index: 5;
    }

    .reason-text {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .reason-text strong {
      color: #818cf8;
    }

    /* Inline Widget Customization Overlay */
    .inline-editor-overlay {
      position: absolute;
      inset: 0;
      padding: 18px;
      border-radius: var(--radius-lg);
      background: rgba(15, 23, 42, 0.96);
      z-index: 50;
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.2s ease-out;
    }

    .editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .editor-header h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .close-editor-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
    }

    .editor-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-field label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .input-text, .input-select {
      width: 100%;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-size: 0.8rem;
      font-family: inherit;
    }

    .input-text:focus, .input-select:focus {
      outline: none;
      border-color: #818cf8;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
    }

    .input-select option {
      background: #0f172a;
      color: #fff;
    }

    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 10px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .btn-primary {
      background: #6366f1;
      border: 1px solid #818cf8;
      color: #fff;
    }

    .chart-canvas {
      flex: 1;
      width: 100%;
      min-height: 270px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChartCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) viz!: Visualization;
  @ViewChild("chartContainer", { static: true }) chartContainer!: ElementRef<HTMLDivElement>;

  datasetService = inject(DatasetService);

  private chartInstance: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  showReason = false;
  isMenuOpen = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  editForm = {
    title: "",
    chart_type: "bar",
    x_axis: "",
    y_axis: "",
    aggregation: "SUM"
  };

  ngOnInit() {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["viz"] && !changes["viz"].firstChange) {
      this.updateChart();
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }

  private initChart() {
    if (!this.chartContainer?.nativeElement) return;

    this.chartInstance = echarts.init(this.chartContainer.nativeElement, undefined, {
      renderer: "canvas"
    });

    this.updateChart();

    this.resizeObserver = new ResizeObserver(() => {
      this.chartInstance?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  private updateChart() {
    if (!this.chartInstance) return;

    let options = this.viz.chart_options;
    if (!options) {
      options = this.buildFallbackOptions();
    }

    const finalOptions = {
      backgroundColor: "transparent",
      ...options
    };

    this.chartInstance.setOption(finalOptions, true);
  }

  private buildFallbackOptions(): any {
    const viz = this.viz as any;
    return {
      backgroundColor: "transparent",
      title: {
        text: viz.title || "No data points available",
        subtext: "Waiting for profile aggregation...",
        left: "center",
        top: "middle",
        textStyle: { color: "var(--text-muted, #94a3b8)", fontSize: 13, fontWeight: 500 },
        subtextStyle: { color: "rgba(148, 163, 184, 0.6)", fontSize: 11 }
      },
      xAxis: { type: "category", data: [], show: false },
      yAxis: { type: "value", show: false },
      series: []
    };
  }

  dimensionColumns(): string[] {
    const profile = this.datasetService.activeProfile();
    if (!profile || !profile.column_types) {
      return [this.viz.x_axis];
    }
    return Object.keys(profile.column_types);
  }

  metricColumns(): string[] {
    const profile = this.datasetService.activeProfile();
    if (!profile || !profile.column_types) {
      return [this.viz.y_axis];
    }
    const numerics = Object.entries(profile.column_types)
      .filter(([_, t]) => (t as string).startsWith("numeric"))
      .map(([col]) => col);
    return numerics.length > 0 ? numerics : Object.keys(profile.column_types);
  }

  openEditModal() {
    this.isMenuOpen.set(false);
    this.editForm = {
      title: this.viz.title,
      chart_type: this.viz.chart_type,
      x_axis: this.viz.x_axis,
      y_axis: this.viz.y_axis,
      aggregation: this.viz.aggregation || "SUM"
    };
    this.isEditing.set(true);
  }

  saveEditChanges() {
    this.datasetService.updateWidget(this.viz.id, {
      title: this.editForm.title,
      chart_type: this.editForm.chart_type,
      x_axis: this.editForm.x_axis,
      y_axis: this.editForm.y_axis,
      aggregation: this.editForm.aggregation
    });
    this.isEditing.set(false);
  }

  quickChangeType(type: string) {
    this.isMenuOpen.set(false);
    this.datasetService.updateWidget(this.viz.id, {
      chart_type: type
    });
  }

  toggleWidth() {
    this.isMenuOpen.set(false);
    this.datasetService.toggleWidgetSpan(this.viz.id);
  }

  duplicate() {
    this.isMenuOpen.set(false);
    this.datasetService.duplicateWidget(this.viz.id);
  }

  remove() {
    this.isMenuOpen.set(false);
    this.datasetService.removeWidget(this.viz.id);
  }
}

