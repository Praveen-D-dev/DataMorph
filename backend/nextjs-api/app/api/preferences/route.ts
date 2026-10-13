import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await DatabaseService.recordPreference(body);
    return apiSuccess({ message: "Preference recorded" });
  } catch (err: any) {
    return apiError(err.message, "ERR_PREFERENCE", 500);
  }
}

export async function GET() {
  try {
    const prefs = await DatabaseService.getPreferences();
    return apiSuccess(prefs);
  } catch (err: any) {
    return apiError(err.message, "ERR_PREFERENCE", 500);
  }
}

export async function DELETE() {
  try {
    await DatabaseService.resetPreferences();
    return apiSuccess({ message: "Preferences reset successfully" });
  } catch (err: any) {
    return apiError(err.message, "ERR_PREFERENCE", 500);
  }
}
