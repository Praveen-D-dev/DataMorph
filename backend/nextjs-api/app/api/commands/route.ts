import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { PythonBridgeService } from "@/services/python-bridge.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { command, dashboardId } = body;

    if (!command) {
      return apiError("Command text is required", "ERR_MISSING_COMMAND", 400);
    }

    if (!dashboardId) {
      return apiError("dashboardId is required", "ERR_MISSING_DASHBOARD_ID", 400);
    }

    const dashboard = await DatabaseService.getDashboard(dashboardId);
    if (!dashboard) {
      return apiError(`Dashboard '${dashboardId}' not found`, "ERR_NOT_FOUND", 404);
    }

    const dataset = await DatabaseService.getDatasetById(dashboard.dataset_id);
    if (!dataset) {
      return apiError(`Dataset '${dashboard.dataset_id}' not found`, "ERR_NOT_FOUND", 404);
    }

    // Process command through Python NLU Engine
    const result = await PythonBridgeService.processCommand(command, dataset.storage_path);

    // If dashboard was mutated, update in database
    if (result.mutated_dashboard) {
      dashboard.layout_grid = result.mutated_dashboard.layout_grid || dashboard.layout_grid;
      dashboard.visualizations = result.mutated_dashboard.visualizations || dashboard.visualizations;
      dashboard.active_filters = result.mutated_dashboard.active_filters || dashboard.active_filters;
      await DatabaseService.updateDashboard(dashboardId, dashboard);
    }

    return apiSuccess({
      intent: result.intent,
      entities: result.entities,
      action_summary: result.action_summary,
      updated_dashboard: dashboard
    }, 200, Date.now() - startTime);
  } catch (err: any) {
    return apiError(`Command processing failed: ${err.message}`, "ERR_COMMAND_FAILED", 500);
  }
}
