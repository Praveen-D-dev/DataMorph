import { NextRequest } from "next/server";
import { FileWatcherService } from "@/services/file-watcher.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await FileWatcherService.checkDatasetUpdate(params.id);
    return apiSuccess(result);
  } catch (err: any) {
    return apiError(`File watch check failed: ${err.message}`, "ERR_FILE_WATCH", 500);
  }
}
