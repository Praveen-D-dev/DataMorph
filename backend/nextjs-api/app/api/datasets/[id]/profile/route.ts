import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { PythonBridgeService } from "@/services/python-bridge.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  try {
    const dataset = await DatabaseService.getDatasetById(params.id);
    if (!dataset) {
      return apiError(`Dataset with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }

    let forceRecalculate = false;
    try {
      const body = await req.json();
      forceRecalculate = !!body.forceRecalculate;
    } catch {}

    // Check cache
    if (!forceRecalculate) {
      const cached = await DatabaseService.getProfile(params.id);
      if (cached) {
        return apiSuccess({ ...cached, cached: true }, 200, Date.now() - startTime);
      }
    }

    // Run Python Profiler
    const profile = await PythonBridgeService.profileDataset(dataset.storage_path);

    // Save profile to database
    await DatabaseService.saveProfile(params.id, profile);

    // Update row/col count if needed
    if (profile.file_info) {
      dataset.row_count = profile.file_info.row_count;
      dataset.column_count = profile.file_info.column_count;
      await DatabaseService.saveDataset(dataset);
    }

    return apiSuccess(profile, 200, Date.now() - startTime);
  } catch (err: any) {
    return apiError(`Profiling failed: ${err.message}`, "ERR_PROFILING_FAILED", 500);
  }
}
