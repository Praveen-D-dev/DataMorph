import { NextRequest } from "next/server";
import { POST as processCommandRoute } from "../../commands/route";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, dashboardId } = body;

    if (!transcript) {
      return new Response(JSON.stringify({ status: "error", error: { message: "Voice transcript required" } }), { status: 400 });
    }

    // Forward to standard command route
    const syntheticReq = new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify({ command: transcript, dashboardId }),
      headers: { "Content-Type": "application/json" }
    });

    return processCommandRoute(syntheticReq);
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "error", error: { message: err.message } }), { status: 500 });
  }
}
