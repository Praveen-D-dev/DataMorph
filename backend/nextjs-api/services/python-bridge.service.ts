import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface PythonBridgeResult<T = any> {
  status: "success" | "error";
  data?: T;
  error?: string;
}

function getProjectRoot(): string {
  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(curr, "ai-engine")) && fs.existsSync(path.join(curr, "datasets"))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(process.cwd(), "..", "..");
}

function getPythonExecutable(): string {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const root = getProjectRoot();
  const candidates = [
    path.join(root, ".venv", "Scripts", "python.exe"),
    path.join(root, ".venv", "bin", "python"),
    path.join(root, "venv", "Scripts", "python.exe"),
    path.join(root, "venv", "bin", "python")
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return process.platform === "win32" ? "python" : "python3";
}

export class PythonBridgeService {
  private static aiEngineUrl = process.env.AI_ENGINE_URL || "http://127.0.0.1:5005";

  private static get pythonScriptPath(): string {
    return path.join(getProjectRoot(), "ai-engine", "main.py");
  }

  /**
   * Attempts to execute a request against the persistent localhost Python HTTP microservice.
   * If unavailable or unpopulated within 2500ms, automatically falls back to spawning the Python CLI subprocess.
   */
  private static async executeHttp<T>(endpoint: string, body: Record<string, any>): Promise<T | null> {
    try {
      const res = await fetch(`${this.aiEngineUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2500)
      });
      if (!res.ok) {
        return null;
      }
      const json: any = await res.json();
      if (json.status === "error") {
        throw new Error(json.message || "Unknown Python AI Engine error");
      }
      return json.data as T;
    } catch {
      return null; // Fall back to CLI
    }
  }

  /**
   * Executes a command against the Python AI engine CLI via standard IPC fallback.
   * Features a strict 20-second timeout to prevent indefinite hangs.
   */
  private static async executePython<T>(args: string[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const pythonExec = getPythonExecutable();
      const projectRoot = getProjectRoot();
      const fullArgs = [this.pythonScriptPath, ...args];

      let isSettled = false;
      const child = spawn(pythonExec, fullArgs, {
        cwd: projectRoot,
        env: {
          ...process.env,
          PYTHONPATH: path.join(projectRoot, "ai-engine"),
          PYTHONUNBUFFERED: "1"
        }
      });

      // Strict 20s watchdog timeout to guarantee it never freezes for 10 minutes
      const watchdog = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            child.kill("SIGTERM");
          } catch {}
          reject(new Error("Python AI Engine execution timed out after 20 seconds."));
        }
      }, 20000);

      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderrData += chunk.toString();
      });

      child.on("close", (code) => {
        clearTimeout(watchdog);
        if (isSettled) return;
        isSettled = true;

        if (code !== 0) {
          return reject(new Error(`Python process exited with code ${code}: ${stderrData || stdoutData}`));
        }

        try {
          // Extract JSON line from possible warning preambles
          const lines = stdoutData.trim().split(/\r?\n/);
          let jsonLine = lines[lines.length - 1];
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith("{") && lines[i].trim().endsWith("}")) {
              jsonLine = lines[i].trim();
              break;
            }
          }

          const parsed: PythonBridgeResult<T> = JSON.parse(jsonLine);
          if (parsed.status === "error") {
            return reject(new Error(parsed.error || "Unknown Python AI engine error"));
          }
          resolve(parsed.data as T);
        } catch (err: any) {
          reject(new Error(`Failed to parse Python JSON output: ${err.message}. Raw output: ${stdoutData}`));
        }
      });

      child.on("error", (err) => {
        clearTimeout(watchdog);
        if (isSettled) return;
        isSettled = true;
        reject(new Error(`Failed to spawn Python process (${pythonExec}): ${err.message}`));
      });
    });
  }

  static async profileDataset(filePath: string): Promise<any> {
    const httpResult = await this.executeHttp<any>("/profile", { file_path: filePath });
    if (httpResult !== null) return httpResult;
    return this.executePython<any>(["profile", "--file", filePath]);
  }

  static async recommendVisualizations(filePath: string, topK = 8): Promise<any> {
    const httpResult = await this.executeHttp<any>("/recommend", { file_path: filePath, top_k: topK });
    if (httpResult !== null) return httpResult;
    return this.executePython<any>(["recommend", "--file", filePath, "--top_k", topK.toString()]);
  }

  static async generateDashboard(filePath: string, title?: string): Promise<any> {
    const httpResult = await this.executeHttp<any>("/dashboard", { file_path: filePath, title });
    if (httpResult !== null) return httpResult;
    const args = ["dashboard", "--file", filePath];
    if (title) args.push("--title", title);
    return this.executePython<any>(args);
  }

  static async recompileWidget(params: {
    filePath: string;
    chartType: string;
    xAxis: string;
    yAxis: string;
    aggregation?: string;
    title?: string;
  }): Promise<any> {
    const httpResult = await this.executeHttp<any>("/widget/recompile", {
      file_path: params.filePath,
      chart_type: params.chartType,
      x_axis: params.xAxis,
      y_axis: params.yAxis,
      aggregation: params.aggregation || "SUM",
      title: params.title
    });
    if (httpResult !== null) return httpResult;
    // If HTTP failed, return basic synthesized fallback
    return {
      chart_type: params.chartType,
      x_axis: params.xAxis,
      y_axis: params.yAxis,
      aggregation: params.aggregation || "SUM",
      title: params.title,
      chart_options: {}
    };
  }

  static async processCommand(text: string, filePath: string, dashboard?: any): Promise<any> {
    const httpResult = await this.executeHttp<any>("/command", {
      command: text,
      file_path: filePath,
      dashboard
    });
    if (httpResult !== null) return httpResult;
    const args = ["command", "--text", text, "--file", filePath];
    if (dashboard) {
      args.push("--dashboard_json", JSON.stringify(dashboard));
    }
    return this.executePython<any>(args);
  }
}
