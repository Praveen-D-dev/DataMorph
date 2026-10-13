import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { DatabaseService, DatasetRecord } from "@/services/database.service";
import { apiSuccess, apiError } from "@/utils/response";

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

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("No file provided in request", "ERR_MISSING_FILE", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("File exceeds maximum allowed upload size of 100MB", "ERR_FILE_TOO_LARGE", 400);
    }

    const rawFilename = path.basename(file.name);
    const ext = path.extname(rawFilename).toLowerCase();
    const supportedTypes = [".csv", ".parquet", ".xlsx", ".xls"];
    if (!supportedTypes.includes(ext)) {
      return apiError(
        `Unsupported file type '${ext}'. Only CSV, XLSX, XLS, and Parquet are supported.`,
        "ERR_UNSUPPORTED_TYPE",
        400
      );
    }

    // Sanitize base filename to prevent path traversal or filesystem quirks
    const baseName = path.basename(rawFilename, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFilename = `${baseName || "dataset"}${ext}`;

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_FILE_SIZE) {
      return apiError("File exceeds maximum allowed upload size of 100MB", "ERR_FILE_TOO_LARGE", 400);
    }
    const buffer = Buffer.from(bytes);

    // Compute SHA-256 hash
    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Deduplicate: if an identical dataset already exists and its file is present on disk, return existing record
    const existingDataset = await DatabaseService.getDatasetByHash(sha256Hash);
    if (existingDataset && fs.existsSync(existingDataset.storage_path)) {
      return apiSuccess(existingDataset, 200, Date.now() - startTime);
    }

    // Local storage path using robust project root
    const uploadDir = path.join(getProjectRoot(), "datasets", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const datasetId = uuidv4();
    const targetPath = path.join(uploadDir, `${datasetId}_${safeFilename}`);

    // Strictly verify target path is inside uploads directory
    const resolvedTarget = path.resolve(targetPath);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!resolvedTarget.startsWith(resolvedUploadDir + path.sep)) {
      return apiError("Invalid filename or target path", "ERR_INVALID_PATH", 400);
    }

    fs.writeFileSync(targetPath, buffer);

    // Read preliminary row and column counts (simple CSV inspection; Excel/Parquet will be profiled by AI Engine)
    let rowCount = 0;
    let colCount = 0;
    if (ext === ".csv") {
      try {
        const text = buffer.toString("utf8");
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        rowCount = Math.max(0, lines.length - 1);
        colCount = lines.length > 0 ? lines[0].split(",").length : 0;
      } catch {}
    }

    const datasetRecord: DatasetRecord = {
      id: datasetId,
      filename: rawFilename,
      storage_path: targetPath,
      file_size_bytes: buffer.length,
      row_count: rowCount,
      column_count: colCount,
      sha256_hash: sha256Hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saved = await DatabaseService.saveDataset(datasetRecord);
    return apiSuccess(saved, 201, Date.now() - startTime);
  } catch (err: any) {
    return apiError(`Upload failed: ${err.message}`, "ERR_UPLOAD_FAILED", 500);
  }
}
