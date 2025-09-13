import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RestoredFilesTrackingService {
  private restoredFileIds: Set<number> = new Set();

  /**
   * Mark a file as restored in this session
   */
  markFileAsRestored(fileId: number): void {
    this.restoredFileIds.add(fileId);
    console.log(`[RestoredFilesTracking] Marked file ${fileId} as restored`);
    console.log(`[RestoredFilesTracking] Total restored files: ${this.restoredFileIds.size}`);
  }

  /**
   * Check if a file was restored in this session
   */
  isFileRestored(fileId: number): boolean {
    return this.restoredFileIds.has(fileId);
  }

  /**
   * Clear all restored files tracking (e.g., when trash is purged)
   */
  clearAll(): void {
    const count = this.restoredFileIds.size;
    this.restoredFileIds.clear();
    console.log(`[RestoredFilesTracking] Cleared ${count} restored file IDs`);
  }

  /**
   * Get all restored file IDs (for debugging)
   */
  getAllRestoredIds(): number[] {
    return Array.from(this.restoredFileIds);
  }

  /**
   * Filter out restored files from an array of files
   */
  filterRestoredFiles(files: any[]): any[] {
    const filteredFiles = files.filter(file => {
      const isRestored = this.isFileRestored(file.id);
      if (isRestored) {
        console.log(`[RestoredFilesTracking] Filtering out restored file: ${file.original_name} (ID: ${file.id})`);
      }
      return !isRestored;
    });

    console.log(`[RestoredFilesTracking] Files after restoration filter: ${files.length} -> ${filteredFiles.length}`);
    return filteredFiles;
  }
}