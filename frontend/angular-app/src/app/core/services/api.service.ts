import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  error?: {
    code: string;
    message: string;
  };
  meta: {
    timestamp: string;
    durationMs?: number;
  };
}

@Injectable({
  providedIn: "root"
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = "http://localhost:3001/api";

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`).pipe(
      map(res => {
        if (res.status === "error") throw new Error(res.error?.message || "API Error");
        return res.data;
      })
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body).pipe(
      map(res => {
        if (res.status === "error") throw new Error(res.error?.message || "API Error");
        return res.data;
      })
    );
  }

  postFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, formData).pipe(
      map(res => {
        if (res.status === "error") throw new Error(res.error?.message || "API Error");
        return res.data;
      })
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`).pipe(
      map(res => {
        if (res.status === "error") throw new Error(res.error?.message || "API Error");
        return res.data;
      })
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body).pipe(
      map(res => {
        if (res.status === "error") throw new Error(res.error?.message || "API Error");
        return res.data;
      })
    );
  }
}

