import { NextRequest } from "next/server";
import { z } from "zod";
import { DatabaseService } from "@/services/database.service";
import { PythonBridgeService } from "@/services/python-bridge.service";
import { apiSuccess, apiError } from "@/utils/response";

const commandSchema = z.object({
  command: z.string().min(1, "Command text is required").max(1000),
  dashboardId: z.string().min(1, "dashboardId is required")
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const parseResult = commandSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        `Invalid command payload: ${parseResult.error.issues.map(i => i.message).join(", ")}`,
        "ERR_VALIDATION",
        400
      );
    }
    const { command, dashboardId } = parseResult.data;

    const dashboard = await DatabaseService.getDashboard(dashboardId);
    if (!dashboard) {
      return apiError(`Dashboard '${dashboardId}' not found`, "ERR_NOT_FOUND", 404);
    }

    const dataset = await DatabaseService.getDatasetById(dashboard.dataset_id);
    if (!dataset) {
      return apiError(`Dataset '${dashboard.dataset_id}' not found`, "ERR_NOT_FOUND", 404);
    }

    // Process command through Python NLU Engine with active dashboard context
    const result = await PythonBridgeService.processCommand(command, dataset.storage_path, dashboard);

    // If dashboard was mutated, update in database
    if (result.mutated_dashboard) {
      dashboard.layout_grid = result.mutated_dashboard.layout_grid || dashboard.layout_grid;
      dashboard.visualizations = result.mutated_dashboard.visualizations || dashboard.visualizations;
      dashboard.active_filters = result.mutated_dashboard.active_filters !== undefined ? result.mutated_dashboard.active_filters : dashboard.active_filters;
      dashboard.kpis = result.mutated_dashboard.kpis || dashboard.kpis;
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
