import fs from "fs";
import crypto from "crypto";
import { DatabaseService } from "./database.service";
import { PythonBridgeService } from "./python-bridge.service";

export interface FileWatchCheckResult {
  status: "unchanged" | "data_updated" | "columns_added" | "columns_removed" | "file_missing";
  message: string;
  hasChanged: boolean;
  addedColumns?: string[];
  removedColumns?: string[];
  newHash?: string;
  updatedDashboard?: any;
}

export class FileWatcherService {
  private static fileMetaCache: Map<string, { mtime: number; size: number; hash: string }> = new Map();

  static async checkDatasetUpdate(datasetId: string): Promise<FileWatchCheckResult> {
    const dataset = await DatabaseService.getDatasetById(datasetId);
    if (!dataset) {
      return {
        status: "file_missing",
        message: "Dataset record not found in database",
        hasChanged: false
      };
    }

    const filePath = dataset.storage_path;

    // Case 5: File moved or renamed
    if (!fs.existsSync(filePath)) {
      return {
        status: "file_missing",
        message: `Connected file is not accessible at ${filePath}. Relocate file to resume synchronization.`,
        hasChanged: true
      };
    }

    try {
      const stats = fs.statSync(filePath);
      const cached = this.fileMetaCache.get(datasetId);

      // Fast check: If mtime and size match, definitely unchanged
      if (cached && cached.mtime === stats.mtimeMs && cached.size === stats.size) {
        return {
          status: "unchanged",
          message: "File unchanged",
          hasChanged: false
        };
      }

      // Compute content hash
      const buffer = fs.readFileSync(filePath);
      const newHash = crypto.createHash("sha256").update(buffer).digest("hex");

      // Case 1: Unchanged content
      if (newHash === dataset.sha256_hash) {
        this.fileMetaCache.set(datasetId, { mtime: stats.mtimeMs, size: stats.size, hash: newHash });
        return {
          status: "unchanged",
          message: "File unchanged",
          hasChanged: false
        };
      }

      // File content HAS changed. Re-profile to inspect structure.
      const newProfile = await PythonBridgeService.profileDataset(filePath);
      const oldProfile = await DatabaseService.getProfile(datasetId);

      const oldCols = oldProfile ? Object.keys(oldProfile.column_types || {}) : [];
      const newCols = Object.keys(newProfile.column_types || {});

      const addedCols = newCols.filter(c => !oldCols.includes(c));
      const removedCols = oldCols.filter(c => !newCols.includes(c));

      // Update dataset record
      dataset.sha256_hash = newHash;
      dataset.file_size_bytes = stats.size;
      dataset.row_count = newProfile.file_info?.row_count || dataset.row_count;
      dataset.column_count = newCols.length;
      dataset.updated_at = new Date().toISOString();

      await DatabaseService.saveDataset(dataset);
      await DatabaseService.saveProfile(datasetId, newProfile);
      this.fileMetaCache.set(datasetId, { mtime: stats.mtimeMs, size: stats.size, hash: newHash });

      // Regenerate fresh dashboard with updated data
      const updatedDashConfig = await PythonBridgeService.generateDashboard(filePath);

      // Persist regenerated dashboard
      let activeDashboard = await DatabaseService.getDashboardByDatasetId(datasetId);
      if (activeDashboard) {
        activeDashboard = {
          ...activeDashboard,
          kpis: updatedDashConfig.kpis,
          visualizations: updatedDashConfig.visualizations,
          filters: updatedDashConfig.filters,
          active_filters: {},
          layout_grid: updatedDashConfig.layout_grid,
          updated_at: new Date().toISOString()
        };
        await DatabaseService.updateDashboard(activeDashboard.id, activeDashboard);
      }

      let changeType: FileWatchCheckResult["status"] = "data_updated";
      let summaryMsg = "Dataset contents updated — refreshed dashboard metrics.";

      // Case 3: New columns added
      if (addedCols.length > 0) {
        changeType = "columns_added";
        summaryMsg = `Detected ${addedCols.length} new column(s): ${addedCols.join(", ")}. Analytical views updated.`;
      }

      // Case 4: Columns removed
      if (removedCols.length > 0) {
        changeType = "columns_removed";
        summaryMsg = `Warning: ${removedCols.length} column(s) removed: ${removedCols.join(", ")}. Handled gracefully.`;
      }

      return {
        status: changeType,
        message: summaryMsg,
        hasChanged: true,
        addedColumns: addedCols,
        removedColumns: removedCols,
        newHash,
        updatedDashboard: activeDashboard || updatedDashConfig
      };
    } catch (err: any) {
      throw new Error(`File watcher update failed: ${err.message}`);
    }
  }
}
