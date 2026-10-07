import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DatasetService } from "../../../core/services/dataset.service";

@Component({
  selector: "app-profile-viewer",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      @if (datasetService.activeProfile(); as profile) {
        <!-- Summary Strip -->
        <div class="profile-header glass-card">
          <div class="header-main">
            <h2 class="profile-title">Dataset Statistical Profile</h2>
            <p class="profile-subtitle">
              {{ profile.file_info.filename }} • {{ profile.file_info.row_count | number }} rows •
              {{ profile.file_info.column_count }} columns •
              <span class="structure-badge">{{ profile.structural_classification }}</span>
            </p>
          </div>
          <button class="btn btn-secondary" (click)="reprofile()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 21h5v-5"></path>
            </svg>
            <span>Re-profile</span>
          </button>
        </div>

        <!-- Data Types Distribution Grid -->
        <div class="type-distribution-grid">
          <div class="type-card glass-card">
            <span class="type-label">Continuous Numerical</span>
            <span class="type-count">{{ profile.type_counts.numeric_continuous }}</span>
          </div>
          <div class="type-card glass-card">
            <span class="type-label">Discrete / Ordinal</span>
            <span class="type-count">{{ profile.type_counts.numeric_discrete }}</span>
          </div>
          <div class="type-card glass-card">
            <span class="type-label">Categorical</span>
            <span class="type-count">{{ profile.type_counts.categorical_nominal }}</span>
          </div>
          <div class="type-card glass-card">
            <span class="type-label">Temporal (Date/Time)</span>
            <span class="type-count">{{ profile.type_counts.datetime }}</span>
          </div>
        </div>

        <!-- Column Statistics Table -->
        <div class="table-card glass-card">
          <h3 class="table-title">Column Statistical Moments</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Detected Type</th>
                  <th>Nulls</th>
                  <th>Unique</th>
                  <th>Mean / Top Val</th>
                  <th>Std / Median</th>
                  <th>Outliers</th>
                </tr>
              </thead>
              <tbody>
                @for (col of getColumns(profile); track col) {
                  @let stat = profile.column_statistics[col];
                  <tr>
                    <td class="col-name">{{ col }}</td>
                    <td><span class="type-badge">{{ stat.detected_type }}</span></td>
                    <td>{{ (stat.null_ratio * 100).toFixed(1) }}%</td>
                    <td>{{ stat.unique_count | number }}</td>
                    <td>{{ stat.mean !== undefined ? stat.mean.toFixed(2) : getTopVal(stat) }}</td>
                    <td>{{ stat.std !== undefined ? stat.std.toFixed(2) : '-' }}</td>
                    <td>
                      @if (stat.outlier_count !== undefined && stat.outlier_count > 0) {
                        <span class="outlier-tag">{{ stat.outlier_count }}</span>
                      } @else {
                        -
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      } @else {
        <div class="empty-state glass-panel">
          <p>No dataset profile loaded. Select or upload a dataset to begin profiling.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
    }

    .profile-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .profile-subtitle {
      font-size: 0.825rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .structure-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .type-distribution-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .type-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .type-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-count {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .table-card {
      padding: 20px 24px;
    }

    .table-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 16px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.825rem;
    }

    .data-table th {
      text-align: left;
      padding: 10px 14px;
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border-glass);
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
    }

    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .col-name {
      font-weight: 600;
      color: var(--text-primary) !important;
      font-family: 'JetBrains Mono', monospace;
    }

    .type-badge {
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
    }

    .outlier-tag {
      background: rgba(244, 63, 94, 0.15);
      color: #fb7185;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
    }
  `]
})
export class ProfileViewerComponent {
  datasetService = inject(DatasetService);

  getColumns(profile: any): string[] {
    return Object.keys(profile.column_types || {});
  }

  getTopVal(stat: any): string {
    if (stat.top_values) {
      const first = Object.keys(stat.top_values)[0];
      return first || "-";
    }
    return "-";
  }

  reprofile() {
    this.datasetService.profileCurrentDataset(true).subscribe();
  }
}
