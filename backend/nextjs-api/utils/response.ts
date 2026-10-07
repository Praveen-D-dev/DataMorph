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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export function apiError(message: string, code = "INTERNAL_SERVER_ERROR", status = 500, details?: any): NextResponse {
  const response: ApiResponse = {
    status: "error",
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  return NextResponse.json(response, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
