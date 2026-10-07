import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    const datasets = await DatabaseService.getDatasets();
    return apiSuccess(datasets, 200, Date.now() - startTime);
  } catch (err: any) {
    return apiError(`Failed to fetch datasets: ${err.message}`, "ERR_FETCH_DATASETS", 500);
  }
}
