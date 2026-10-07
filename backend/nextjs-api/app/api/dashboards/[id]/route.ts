import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

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
    const updated = await DatabaseService.updateDashboard(params.id, body);
    if (!updated) {
      return apiError(`Dashboard with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError(err.message, "ERR_UPDATE_DASHBOARD", 500);
  }
}
