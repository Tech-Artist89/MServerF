import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  uploadedAt?: Date;
  errorMessage?: string;
  fileType: 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private storage = inject(StorageService);

  readonly activeUploads = signal<UploadItem[]>([]);

  constructor() {
    // Auto-cleanup completed uploads after 5 seconds
    setInterval(() => this.cleanupCompletedUploads(), 5000);
  }

  uploadFile(file: File, projectId?: number, folderId?: number): Observable<UploadItem> {
    const uploadId = this.generateUploadId();
    const fileType = this.getFileType(file);

    const uploadItem: UploadItem = {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'pending',
      fileType: fileType
    };

    // Add to active uploads
    this.activeUploads.update(uploads => [...uploads, uploadItem]);

    return new Observable<UploadItem>(observer => {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('project', projectId.toString());
      if (folderId) formData.append('folder', folderId.toString());

      const req = new HttpRequest('POST', `${this.auth.apiBase()}/files/`, formData, {
        reportProgress: true
      });

      this.http.request(req).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            this.updateUploadProgress(uploadId, progress, 'uploading');
            observer.next({ ...uploadItem, progress, status: 'uploading' });
          } else if (event.type === HttpEventType.Response) {
            this.updateUploadProgress(uploadId, 100, 'completed');
            uploadItem.uploadedAt = new Date();
            observer.next({ ...uploadItem, progress: 100, status: 'completed', uploadedAt: new Date() });
            observer.complete();

            // Refresh storage stats after successful upload
            setTimeout(() => this.storage.refreshStats(), 1000);
          }
        },
        error: (error) => {
          const errorMessage = error.error?.message || 'Upload failed';
          this.updateUploadProgress(uploadId, 0, 'error', errorMessage);
          observer.next({ ...uploadItem, status: 'error', errorMessage });
          observer.error(error);
        }
      });
    });
  }

  private updateUploadProgress(uploadId: string, progress: number, status: UploadItem['status'], errorMessage?: string): void {
    this.activeUploads.update(uploads =>
      uploads.map(upload =>
        upload.id === uploadId
          ? { ...upload, progress, status, errorMessage, uploadedAt: status === 'completed' ? new Date() : upload.uploadedAt }
          : upload
      )
    );
  }

  private cleanupCompletedUploads(): void {
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    this.activeUploads.update(uploads =>
      uploads.filter(upload =>
        upload.status !== 'completed' ||
        !upload.uploadedAt ||
        upload.uploadedAt > fiveSecondsAgo
      )
    );
  }

  private generateUploadId(): string {
    return 'upload-' + Math.random().toString(36).substr(2, 9);
  }

  private getFileType(file: File): UploadItem['fileType'] {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
      return 'image';
    }
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'].includes(extension)) {
      return 'video';
    }
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
      return 'audio';
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(extension)) {
      return 'document';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'archive';
    }
    return 'other';
  }

  getFileIcon(fileType: UploadItem['fileType']): string {
    switch (fileType) {
      case 'image': return 'bi-file-image';
      case 'video': return 'bi-camera-video';
      case 'audio': return 'bi-music-note';
      case 'document': return 'bi-file-text';
      case 'archive': return 'bi-file-zip';
      default: return 'bi-file-earmark';
    }
  }

  cancelUpload(uploadId: string): void {
    this.activeUploads.update(uploads =>
      uploads.filter(upload => upload.id !== uploadId)
    );
  }

  clearAllUploads(): void {
    this.activeUploads.set([]);
  }
}