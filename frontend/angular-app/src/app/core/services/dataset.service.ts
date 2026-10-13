import { Injectable, inject, signal } from "@angular/core";
import { ApiService } from "./api.service";
import { VoiceService } from "./voice.service";
import { Dataset, DatasetProfile } from "../models/dataset.model";
import { Dashboard, Visualization } from "../models/dashboard.model";
import { CommandResult } from "../models/command.model";
import { Observable, tap, of, throwError, Subscription, switchMap, EMPTY } from "rxjs";

export interface AIPipelineStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
}

@Injectable({
  providedIn: "root"
})
export class DatasetService {
  private api = inject(ApiService);
  private voice = inject(VoiceService);

  datasets = signal<Dataset[]>([]);
  activeDataset = signal<Dataset | null>(null);
  activeProfile = signal<DatasetProfile | null>(null);
  activeDashboard = signal<Dashboard | null>(null);
  activeSectionId = signal<string>("main");
  recommendations = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  statusMessage = signal<string>("");
  pipelineError = signal<string | null>(null);

  aiPipelineSteps = signal<AIPipelineStep[]>([
    { id: "validate", label: "Dataset validated", status: "pending" },
    { id: "types", label: "Column types detected", status: "pending" },
    { id: "profile", label: "Data profile generated", status: "pending" },
    { id: "domains", label: "Analytical domains identified", status: "pending" },
    { id: "candidates", label: "Visualization candidates generated", status: "pending" },
    { id: "ranking", label: "Recommendations ranked", status: "pending" },
    { id: "dashboard", label: "Dashboard generated", status: "pending" }
  ]);

  loadDatasets(): Observable<Dataset[]> {
    this.isLoading.set(true);
    this.statusMessage.set("Loading local datasets...");
    return this.api.get<Dataset[]>("/datasets").pipe(
      tap({
        next: (list) => {
          this.datasets.set(list);
          this.isLoading.set(false);
          this.statusMessage.set("");
          if (list.length > 0 && !this.activeDataset()) {
            this.selectDataset(list[0]);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.statusMessage.set(`Failed to load datasets: ${err.message}`);
        }
      })
    );
  }

  uploadDataset(file: File): Observable<Dataset> {
    this.pipelineError.set(null);
    this.resetPipelineSteps();
    this.isLoading.set(true);
    this.isAnalyzing.set(true);
    this.statusMessage.set(`Uploading and fingerprinting ${file.name}...`);
    this.updateStepStatus("validate", "active");

    const formData = new FormData();
    formData.append("file", file);

    return this.api.postFormData<Dataset>("/datasets/upload", formData).pipe(
      tap({
        next: (uploaded) => {
          this.updateStepStatus("validate", "done");
          this.updateStepStatus("types", "active");
          this.datasets.update((prev) => [uploaded, ...prev]);
          this.activeDataset.set(uploaded);
          this.activeProfile.set(null);
          this.activeDashboard.set(null);
          this.activeSectionId.set("main");

          // Run progressive AI pipeline
          this.runAIPipeline(uploaded);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.isAnalyzing.set(false);
          this.pipelineError.set(err.message || "Failed to upload dataset.");
          this.statusMessage.set(`Upload error: ${err.message}`);
        }
      })
    );
  }

  private pipelineSub: Subscription | null = null;

  selectDataset(dataset: Dataset) {
    if (this.activeDataset()?.id === dataset.id) return;

    if (this.pipelineSub) {
      this.pipelineSub.unsubscribe();
      this.pipelineSub = null;
    }

    this.activeDataset.set(dataset);
    this.activeProfile.set(null);
    this.activeDashboard.set(null);
    this.activeSectionId.set("main");
    this.recommendations.set([]);
    this.resetPipelineSteps();

    // First attempt to load existing saved dashboard (prevents duplicate dashboard generations)
    this.isLoading.set(true);
    this.statusMessage.set("Loading saved dashboard...");
    this.api.get<Dashboard>(`/datasets/${dataset.id}/dashboard`).subscribe({
      next: (existingDash) => {
        this.activeDashboard.set(existingDash);
        // Load profile
        this.api.get<any>(`/datasets/${dataset.id}`).subscribe({
          next: (dsInfo) => {
            if (dsInfo?.profile) this.activeProfile.set(dsInfo.profile);
          }
        });
        this.aiPipelineSteps.update((steps) => steps.map((s) => ({ ...s, status: "done" })));
        this.isLoading.set(false);
        this.isAnalyzing.set(false);
        this.statusMessage.set(`Loaded dashboard: ${existingDash.title}`);
      },
      error: () => {
        // No dashboard generated yet for this dataset: run fresh AI synthesis pipeline
        this.runAIPipeline(dataset);
      }
    });
  }

  retryCurrentAnalysis() {
    const ds = this.activeDataset();
    if (ds) {
      this.pipelineError.set(null);
      this.runAIPipeline(ds);
    }
  }

  private resetPipelineSteps() {
    this.aiPipelineSteps.set([
      { id: "validate", label: "Dataset validated", status: "pending" },
      { id: "types", label: "Column types detected", status: "pending" },
      { id: "profile", label: "Data profile generated", status: "pending" },
      { id: "domains", label: "Analytical domains identified", status: "pending" },
      { id: "candidates", label: "Visualization candidates generated", status: "pending" },
      { id: "ranking", label: "Recommendations ranked", status: "pending" },
      { id: "dashboard", label: "Dashboard generated", status: "pending" }
    ]);
  }

  private updateStepStatus(id: string, status: "pending" | "active" | "done") {
    this.aiPipelineSteps.update((steps) =>
      steps.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  private runAIPipeline(dataset: Dataset) {
    if (this.pipelineSub) {
      this.pipelineSub.unsubscribe();
      this.pipelineSub = null;
    }

    this.pipelineError.set(null);
    this.isAnalyzing.set(true);
    this.isLoading.set(true);
    this.statusMessage.set("Profiling data structure and column topologies...");
    this.updateStepStatus("validate", "done");
    this.updateStepStatus("types", "active");

    this.pipelineSub = this.api.post<DatasetProfile>(`/datasets/${dataset.id}/profile`, { forceRecalculate: false }).pipe(
      switchMap((profile) => {
        if (this.activeDataset()?.id !== dataset.id) return EMPTY;
        this.activeProfile.set(profile);
        this.updateStepStatus("types", "done");
        this.updateStepStatus("profile", "done");
        this.updateStepStatus("domains", "active");
        this.updateStepStatus("candidates", "active");
        this.statusMessage.set("Synthesizing analytical visualizations & layout...");
        return this.api.post<Dashboard>(`/datasets/${dataset.id}/dashboard`, {});
      })
    ).subscribe({
      next: (dash) => {
        if (this.activeDataset()?.id !== dataset.id) return;
        this.activeDashboard.set(dash);
        this.activeSectionId.set("main");
        this.updateStepStatus("domains", "done");
        this.updateStepStatus("candidates", "done");
        this.updateStepStatus("ranking", "done");
        this.updateStepStatus("dashboard", "done");
        this.isAnalyzing.set(false);
        this.isLoading.set(false);
        this.statusMessage.set("");
        this.voice.speakVisionConfirmation(
          `Dashboard created with ${dash.visualizations?.length || 0} visualizations.`
        );
      },
      error: (err) => {
        if (this.activeDataset()?.id !== dataset.id) return;
        this.isAnalyzing.set(false);
        this.isLoading.set(false);
        this.pipelineError.set(`AI pipeline error: ${err.message || "Failed to analyze dataset."}`);
        this.statusMessage.set(`Pipeline error: ${err.message}`);
      }
    });
  }

  profileCurrentDataset(force = false): Observable<DatasetProfile> {
    const current = this.activeDataset();
    if (!current) throw new Error("No dataset selected");

    return this.api.post<DatasetProfile>(`/datasets/${current.id}/profile`, { forceRecalculate: force }).pipe(
      tap({
        next: (profile) => {
          this.activeProfile.set(profile);
        },
        error: (err) => {
          this.statusMessage.set(`Profiling error: ${err.message}`);
        }
      })
    );
  }

  loadRecommendations(): Observable<any[]> {
    const current = this.activeDataset();
    if (!current) throw new Error("No dataset selected");

    return this.api.post<any[]>(`/datasets/${current.id}/recommend`, { topK: 8 }).pipe(
      tap({
        next: (recs) => this.recommendations.set(recs)
      })
    );
  }


  generateDashboardForCurrent(): Observable<Dashboard> {
    const current = this.activeDataset();
    if (!current) throw new Error("No dataset selected");

    return this.api.post<Dashboard>(`/datasets/${current.id}/dashboard`, {}).pipe(
      tap({
        next: (dash) => {
          this.activeDashboard.set(dash);
          this.activeSectionId.set("main");
          this.statusMessage.set("");
        },
        error: (err) => {
          this.statusMessage.set(`Dashboard generation error: ${err.message}`);
        }
      })
    );
  }

  setActiveSection(sectionId: string) {
    this.activeSectionId.set(sectionId);
  }

  // --- Granular Widget Editing Operations (Section 17, 18, 19, 44) ---
  updateWidget(widgetId: string, updates: Partial<Visualization>) {
    const dash = this.activeDashboard();
    if (!dash) return;

    const target = dash.visualizations.find((v) => v.id === widgetId);
    if (!target) return;

    // Record preference signal if chart type was changed
    if (updates.chart_type && updates.chart_type !== target.chart_type) {
      this.recordPreferenceSignal(target.chart_type, updates.chart_type, target.dimension || target.x_axis);
    }

    // Call widget recompile API via PUT /dashboards/:id/widgets/:widgetId
    this.api.put<any>(`/dashboards/${dash.id}/widgets/${widgetId}`, {
      chart_type: updates.chart_type || target.chart_type,
      dimension: updates.x_axis || target.x_axis,
      metric: updates.y_axis || target.y_axis,
      aggregation: updates.aggregation || target.aggregation,
      title: updates.title || target.title
    }).subscribe({
      next: (res) => {
        const updated = res.widget || res;
        if (updated && updated.chart_options) {
          this.activeDashboard.update((d) => {
            if (!d) return null;
            return {
              ...d,
              visualizations: d.visualizations.map((v) =>
                v.id === widgetId ? { ...v, ...updates, ...updated } : v
              )
            };
          });
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || "Invalid column combination or chart type";
        this.statusMessage.set(`Widget update failed: ${msg}`);
      }
    });
  }

  removeWidget(widgetId: string) {
    const dash = this.activeDashboard();
    if (dash) {
      this.api.delete(`/dashboards/${dash.id}/widgets/${widgetId}`).subscribe({
        next: () => {
          this.statusMessage.set("Widget removed from dashboard");
        },
        error: (err) => {
          this.statusMessage.set(`Failed to delete widget: ${err?.message || "server error"}`);
        }
      });
    }

    this.activeDashboard.update((d) => {
      if (!d) return null;
      return {
        ...d,
        visualizations: d.visualizations.filter((v) => v.id !== widgetId)
      };
    });
  }

  duplicateWidget(widgetId: string) {
    const dash = this.activeDashboard();
    if (!dash) return;
    const target = dash.visualizations.find((v) => v.id === widgetId);
    if (!target) return;

    const copy: Visualization = {
      ...target,
      id: `viz-copy-${Date.now()}`,
      title: `${target.title} (Copy)`,
      display_order: dash.visualizations.length
    };

    const newVizList = [...dash.visualizations, copy];
    this.activeDashboard.update((d) => {
      if (!d) return null;
      return {
        ...d,
        visualizations: newVizList
      };
    });

    // Persist duplicated widget to server
    this.api.put(`/dashboards/${dash.id}`, { visualizations: newVizList }).subscribe({
      error: () => {}
    });
  }

  toggleWidgetSpan(widgetId: string) {
    const dash = this.activeDashboard();
    if (!dash) return;

    const updated = dash.visualizations.map((v) => {
      if (v.id === widgetId) {
        const currentSpan = v.col_span || 1;
        return { ...v, col_span: currentSpan === 1 ? 2 : 1 };
      }
      return v;
    });

    this.activeDashboard.update((d) => {
      if (!d) return null;
      return {
        ...d,
        visualizations: updated
      };
    });

    // Persist span to server
    this.api.put(`/dashboards/${dash.id}`, { visualizations: updated }).subscribe({
      error: () => {}
    });
  }

  refreshActiveDataset() {
    const current = this.activeDataset();
    if (!current) return;
    this.isLoading.set(true);
    this.statusMessage.set("Checking local file for modifications...");
    this.api.post<any>(`/datasets/${current.id}/watch`, {}).subscribe({
      next: (res) => {
        if (res?.hasChanged && res?.updatedDashboard) {
          this.activeDashboard.set(res.updatedDashboard);
          this.statusMessage.set(res.message || "Dashboard refreshed with updated file data.");
          this.isLoading.set(false);
        } else {
          // If file content hash unchanged, run fresh AI synthesis pipeline
          this.runAIPipeline(current);
        }
      },
      error: () => {
        this.runAIPipeline(current);
      }
    });
  }

  removeActiveDataset() {
    const current = this.activeDataset();
    if (current) {
      const idToDelete = current.id;
      // Persist deletion to backend API, unlinking disk files and clearing database entries
      this.api.delete(`/datasets/${idToDelete}`).subscribe({
        next: () => {
          this.statusMessage.set(`Dataset '${current.filename}' and local files removed.`);
        },
        error: (err) => {
          console.warn(`Failed to delete dataset from backend storage:`, err);
        }
      });

      this.datasets.update((prev) => prev.filter((d) => d.id !== idToDelete));
      const remaining = this.datasets();
      if (remaining.length > 0) {
        this.selectDataset(remaining[0]);
      } else {
        this.activeDataset.set(null);
        this.activeProfile.set(null);
        this.activeDashboard.set(null);
        this.activeSectionId.set("main");
      }
    }
  }

  private recordPreferenceSignal(fromType: string, toType: string, dimension?: string) {
    this.api.post("/preferences", {
      action: "chart_type_replaced",
      category: fromType,
      target: toType,
      value: dimension || "general"
    }).subscribe({
      error: () => {} // Silent non-blocking preference logging
    });
  }

  executeCommand(commandText: string): Observable<CommandResult> {
    const dash = this.activeDashboard();
    if (!dash) {
      return throwError(() => new Error("Please select or load a dataset first."));
    }

    this.isLoading.set(true);
    this.statusMessage.set(`Processing command: "${commandText}"...`);

    return this.api.post<CommandResult>("/commands", {
      command: commandText,
      dashboardId: dash.id
    }).pipe(
      tap({
        next: (res) => {
          if (res.updated_dashboard) {
            this.activeDashboard.set(res.updated_dashboard);
          }
          this.isLoading.set(false);
          this.statusMessage.set(res.action_summary || "Dashboard adapted successfully.");
        },
        error: (err) => {
          this.isLoading.set(false);
          this.statusMessage.set(`Command error: ${err.message}`);
        }
      })
    );
  }
}

