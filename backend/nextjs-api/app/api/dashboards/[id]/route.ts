import { NextRequest } from "next/server";
import { z } from "zod";
import { DatabaseService } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

const updateDashboardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  layout_grid: z.any().optional(),
  is_active: z.boolean().optional(),
  kpis: z.array(z.any()).optional(),
  visualizations: z.array(z.any()).optional(),
  filters: z.array(z.any()).optional(),
  active_filters: z.record(z.any()).optional(),
  navigation_sections: z.array(z.any()).optional()
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dashboard = await DatabaseService.getDashboard(params.id);
    if (!dashboard) {
      return apiError(`Dashboard with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }
    return apiSuccess(dashboard);
  } catch (err: any) {
    return apiError(err.message, "ERR_FETCH_DASHBOARD", 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parseResult = updateDashboardSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        `Invalid dashboard update payload: ${parseResult.error.issues.map(i => i.message).join(", ")}`,
        "ERR_VALIDATION",
        400
      );
    }
    const updated = await DatabaseService.updateDashboard(params.id, parseResult.data);
    if (!updated) {
      return apiError(`Dashboard with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError(err.message, "ERR_UPDATE_DASHBOARD", 500);
  }
}
