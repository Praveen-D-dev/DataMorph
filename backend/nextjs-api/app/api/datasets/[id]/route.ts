import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dataset = await DatabaseService.getDatasetById(params.id);
    if (!dataset) {
      return apiError(`Dataset with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }
    const profile = await DatabaseService.getProfile(params.id);
    return apiSuccess({ ...dataset, hasProfile: !!profile, profile });
  } catch (err: any) {
    return apiError(err.message, "ERR_FETCH_DATASET", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = await DatabaseService.deleteDataset(params.id);
    return apiSuccess({ deleted: success, id: params.id });
  } catch (err: any) {
    return apiError(err.message, "ERR_DELETE_DATASET", 500);
  }
}
