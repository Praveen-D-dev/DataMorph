import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    durationMs?: number;
  };
}

const ALLOWED_ORIGIN = "http://localhost:4200";

export function apiSuccess<T>(data: T, status = 200, durationMs?: number): NextResponse {
  const response: ApiResponse<T> = {
    status: "success",
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(durationMs !== undefined ? { durationMs } : {})
    }
  };
  return NextResponse.json(response, {
    status,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Vary": "Origin"
    }
  });
}

function cleanErrorMessage(msg: string): string {
  if (!msg) return "An error occurred";
  return msg
    .replace(/[A-Z]:\\[^:\n\r\t"]+/gi, (match) => {
      const parts = match.split(/\\/);
      return parts[parts.length - 1];
    })
    .replace(/\/(?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+/g, (match) => {
      const parts = match.split(/\//);
      return parts[parts.length - 1];
    });
}

export function apiError(message: string, code = "INTERNAL_SERVER_ERROR", status = 500, details?: any): NextResponse {
  const sanitizedMessage = cleanErrorMessage(message);
  const response: ApiResponse = {
    status: "error",
    error: {
      code,
      message: sanitizedMessage,
      ...(details ? { details } : {})
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  return NextResponse.json(response, {
    status,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Vary": "Origin"
    }
  });
}
