import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { KpiCard } from "../../../core/models/dashboard.model";

@Component({
  selector: "app-kpi-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="kpi-card"
      [class.kpi-gradient]="kpi.card_style === 'gradient' || (kpi.variant === 'gradient-electric')"
      [class.kpi-glass]="kpi.card_style !== 'gradient' && (kpi.variant !== 'gradient-electric')"
    >
      <!-- Top Row: Title & Big Value -->
      <div class="kpi-top-row">
        <div class="kpi-title-box">
          <span class="kpi-title">{{ kpi.title }}</span>
          <span class="kpi-subtitle" *ngIf="kpi.subtitle && kpi.card_style !== 'gradient'">{{ kpi.subtitle }}</span>
        </div>
        <div class="kpi-value-box">
          <span class="kpi-value" [style.color]="(kpi.card_style === 'gradient' || kpi.variant === 'gradient-electric') ? '#ffffff' : (kpi.color || 'var(--accent-primary)')">
            {{ kpi.formatted_value || kpi.value }}
          </span>
        </div>
      </div>

      <!-- Bottom Row: Trend badge & Context pill badge -->
      <div class="kpi-footer-row">
        <!-- Trend indicator (only rendered when genuine trend data exists) -->
        <div 
          class="kpi-trend-pill" 
          *ngIf="kpi.trend || kpi.change !== undefined"
          [class.trend-up]="kpi.trend_direction === 'up' || kpi.trend === 'up'"
          [class.trend-down]="kpi.trend_direction === 'down' || kpi.trend === 'down'"
          [class.trend-on-gradient]="kpi.card_style === 'gradient' || kpi.variant === 'gradient-electric'"
        >
          <span class="trend-arrow">{{ (kpi.trend_direction === 'up' || kpi.trend === 'up') ? '↗' : '↘' }}</span>
          <span class="trend-text">{{ kpi.change ? ((kpi.change > 0 ? '+' : '') + kpi.change + '%') : kpi.trend }}</span>
        </div>

        <!-- Pill badge -->
        <div 
          class="kpi-badge-pill"
          [class.badge-on-gradient]="kpi.card_style === 'gradient' || kpi.variant === 'gradient-electric'"
        >
          {{ kpi.badge || kpi.subtext || kpi.subtitle || 'Active' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      border-radius: var(--radius-lg, 16px);
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
      position: relative;
      overflow: hidden;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
    }

    /* Style 1: Solid Vibrant Electric Gradient (like reference image cards 1 & 2) */
    .kpi-gradient {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    /* Style 2: Modern Frosted Glass (like reference image cards 3 & 4) */
    .kpi-glass {
      background: var(--bg-surface, rgba(17, 24, 39, 0.7));
      border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.08));
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .kpi-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .kpi-title-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .kpi-title {
      font-size: 0.88rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      opacity: 0.95;
    }

    .kpi-gradient .kpi-title {
      color: #f8fafc;
    }

    .kpi-glass .kpi-title {
      color: var(--text-secondary, #94a3b8);
    }

    .kpi-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted, #64748b);
    }

    .kpi-value-box {
      display: flex;
      align-items: baseline;
    }

    .kpi-value {
      font-size: 2.1rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
      font-feature-settings: "tnum";
    }

    .kpi-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 18px;
      gap: 8px;
    }

    /* Trend Pill */
    .kpi-trend-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
    }

    .trend-arrow {
      font-size: 0.85rem;
      font-weight: 800;
    }

    /* Trends on Gradient background (White-tinted translucent) */
    .kpi-trend-pill.trend-on-gradient {
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.35);
      backdrop-filter: blur(4px);
    }

    .kpi-trend-pill.trend-on-gradient.trend-down {
      background: rgba(239, 68, 68, 0.3);
      border-color: rgba(239, 68, 68, 0.5);
    }

    /* Trends on Glass background */
    .kpi-trend-pill.trend-up:not(.trend-on-gradient) {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .kpi-trend-pill.trend-down:not(.trend-on-gradient) {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* Secondary Context Pill Badge */
    .kpi-badge-pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      background: rgba(15, 23, 42, 0.8);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .kpi-badge-pill.badge-on-gradient {
      background: rgba(15, 23, 42, 0.45);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class KpiCardComponent {
  @Input({ required: true }) kpi!: KpiCard;
}
