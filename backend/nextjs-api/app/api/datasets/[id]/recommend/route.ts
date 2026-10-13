import { NextRequest } from "next/server";
import { z } from "zod";
import { DatabaseService } from "@/services/database.service";
import { PythonBridgeService } from "@/services/python-bridge.service";
import { apiSuccess, apiError } from "@/utils/response";

const recommendSchema = z.object({
  topK: z.coerce.number().int().min(1).max(50).default(10)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  try {
    const dataset = await DatabaseService.getDatasetById(params.id);
    if (!dataset) {
      return apiError(`Dataset with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }

    let topK = 10;
    try {
      const body = await req.json();
      const parseResult = recommendSchema.safeParse(body);
      if (parseResult.success) {
        topK = parseResult.data.topK;
      }
    } catch {}

    const recommendations = await PythonBridgeService.recommendVisualizations(dataset.storage_path, topK);
    return apiSuccess(recommendations, 200, Date.now() - startTime);
  } catch (err: any) {
    return apiError(`Recommendation failed: ${err.message}`, "ERR_RECOMMEND_FAILED", 500);
  }
}
