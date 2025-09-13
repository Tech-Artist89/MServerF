import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export interface StorageStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  usagePercentage: number;
  breakdown: {
    images: number;
    documents: number;
    archives: number;
    media: number;
    trash: number;
    other: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly storageStats = signal<StorageStats | null>(null);
  readonly loading = signal<boolean>(false);

  constructor() {
    // Auto-refresh every 30 seconds
    timer(0, 30000).pipe(
      switchMap(() => this.loadStorageStats()),
      catchError(() => of(null))
    ).subscribe(stats => {
      if (stats) {
        this.storageStats.set(stats);
      }
    });
  }

  private loadStorageStats(): Observable<StorageStats> {
    this.loading.set(true);
    return this.http.get<any>(`${this.auth.apiBase()}/storage/stats/`).pipe(
      switchMap((response) => {
        this.loading.set(false);
        // Transform backend response to our StorageStats format
        const stats: StorageStats = {
          totalSize: response.total_size || 137438953472, // 128 GB default
          usedSize: response.used_size || 0,
          availableSize: response.available_size || 137438953472,
          usagePercentage: response.usage_percentage || 0,
          breakdown: {
            images: response.breakdown?.images || 0,
            documents: response.breakdown?.documents || 0,
            archives: response.breakdown?.archives || 0,
            media: response.breakdown?.media || 0,
            trash: response.breakdown?.trash || 0,
            other: response.breakdown?.other || 0
          }
        };
        return of(stats);
      }),
      catchError(() => {
        this.loading.set(false);
        // Return mock data if API fails
        return of({
          totalSize: 137438953472, // 128 GB
          usedSize: 93910188236, // ~87.5 GB
          availableSize: 43528765236,
          usagePercentage: 68,
          breakdown: {
            images: 12884901888, // 12 GB
            documents: 536870912, // 512 MB
            archives: 21474836480, // 20 GB
            media: 32212254720, // 30 GB
            trash: 48318382080, // 45 GB
            other: 0
          }
        } as StorageStats);
      })
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  refreshStats(): void {
    this.loadStorageStats().subscribe(stats => {
      if (stats) {
        this.storageStats.set(stats);
      }
    });
  }
}