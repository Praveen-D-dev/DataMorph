import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function POST(req: NextRequest) {
  try {
    await DatabaseService.resetPreferences();
    return apiSuccess({ message: "Preferences reset successfully" });
  } catch (err: any) {
    return apiError(err.message, "ERR_PREFERENCES_RESET", 500);
  }
}
