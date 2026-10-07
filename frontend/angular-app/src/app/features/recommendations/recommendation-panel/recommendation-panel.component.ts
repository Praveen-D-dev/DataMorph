import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DatasetService } from "../../../core/services/dataset.service";

@Component({
  selector: "app-recommendation-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recommendations-container">
      <div class="panel-header glass-card">
        <div>
          <h2 class="panel-title">AI Visualization Recommendations</h2>
          <p class="panel-subtitle">
            Ranked candidate visual mappings evaluated by Grammar of Graphics rules & Scikit-learn suitability scoring.
          </p>
        </div>
        <button class="btn btn-primary" (click)="refreshRecommendations()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh Analysis</span>
        </button>
      </div>

      <div class="candidates-grid">
        @for (rec of datasetService.recommendations(); track rec.title) {
          <div class="rec-card glass-card">
            <div class="rec-top">
              <span class="chart-type-tag" [class]="'tag-' + rec.chart_type">
                {{ rec.chart_type }}
              </span>
              <div class="score-pill">
                <span class="score-label">Fitness</span>
                <span class="score-val">{{ (rec.score * 100).toFixed(0) }}%</span>
              </div>
            </div>

            <h3 class="rec-title">{{ rec.title }}</h3>

            <div class="axes-meta">
              <div class="axis-row">
                <span class="axis-label">X-Axis</span>
                <span class="axis-val">{{ rec.x_axis }}</span>
              </div>
              <div class="axis-row">
                <span class="axis-label">Y-Axis</span>
                <span class="axis-val">{{ rec.y_axis }} ({{ rec.aggregation }})</span>
              </div>
            </div>

            <div class="reason-box">
              <span class="reason-label">Causal Justification:</span>
              <p class="reason-text">{{ rec.reason }}</p>
            </div>
          </div>
        } @empty {
          <div class="empty-state glass-card">
            <p>No recommendations loaded yet. Click 'Refresh Analysis' to generate candidates.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .recommendations-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
    }

    .panel-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .panel-subtitle {
      font-size: 0.825rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .candidates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }

    .rec-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .rec-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chart-type-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .tag-bar { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .tag-line { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
    .tag-pie { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
    .tag-scatter { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .tag-box { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .tag-histogram { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }

    .score-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .score-label {
      font-size: 0.68rem;
      color: #34d399;
      text-transform: uppercase;
      font-weight: 600;
    }

    .score-val {
      font-size: 0.8rem;
      font-weight: 800;
      color: #34d399;
    }

    .rec-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .axes-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(15, 23, 42, 0.6);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.775rem;
    }

    .axis-row {
      display: flex;
      justify-content: space-between;
    }

    .axis-label {
      color: var(--text-muted);
      font-weight: 500;
    }

    .axis-val {
      color: var(--text-secondary);
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    .reason-box {
      background: rgba(255, 255, 255, 0.02);
      border-left: 2px solid var(--accent-primary);
      padding: 8px 12px;
      border-radius: 0 4px 4px 0;
    }

    .reason-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }

    .reason-text {
      font-size: 0.775rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .empty-state {
      grid-column: 1 / -1;
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
    }
  `]
})
export class RecommendationPanelComponent {
  datasetService = inject(DatasetService);

  refreshRecommendations() {
    this.datasetService.loadRecommendations().subscribe();
  }
}
