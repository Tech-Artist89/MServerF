import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { NgIf, NgClass, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { StorageService } from '../core/storage.service';
import { UploadService } from '../core/upload.service';
import { ToastsComponent } from '../shared/toasts.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgClass, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, ToastsComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  storageService = inject(StorageService);
  uploadService = inject(UploadService);

  adminDropdownOpen = false;

  ngOnInit() {
    if (this.auth.isAccessTokenValid && !this.auth.me()) {
      this.auth.loadMe().subscribe({ next: (me) => this.auth.me.set(me), error: () => {} });
    }
  }

  toggleAdminDropdown() {
    this.adminDropdownOpen = !this.adminDropdownOpen;
  }

  get storageStats() {
    return this.storageService.storageStats();
  }

  get activeUploads() {
    return this.uploadService.activeUploads();
  }

  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  getUploadIcon(fileType: any): string {
    return this.uploadService.getFileIcon(fileType);
  }

  cancelUpload(uploadId: string): void {
    this.uploadService.cancelUpload(uploadId);
  }
}
