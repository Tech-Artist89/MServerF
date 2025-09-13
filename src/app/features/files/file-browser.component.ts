import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-file-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss'
})
export class FileBrowserComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private toast = inject(ToastService);

  projectId!: string;
  projectName = '';
  files: any[] = [];
  folders: any[] = [];
  selectedFolderId: number | null = null;
  q = '';
  page = 1;
  pageSize = 10;
  Math = Math;
  viewTrash = false;
  isSharedAccess = false;
  // Rename modal state
  renameTarget: any = null;
  renameName = '';

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    
    // Check if this is shared access from route data or URL
    this.isSharedAccess = this.route.snapshot.data['shared'] === true || 
                         this.route.snapshot.url.some(segment => segment.path === 'shared');
    
    this.loadProject();
    this.loadFolders();
    this.loadFiles();
  }

  loadProject() {
    this.http.get<any>(`${this.auth.apiBase()}/projects/${this.projectId}/`).subscribe({
      next: (project) => {
        this.projectName = project.name || 'Projekt';
      },
      error: () => {}
    });
  }

  goBack() {
    // Navigate back to the appropriate view based on access type
    if (this.isSharedAccess) {
      this.router.navigate(['/shared']);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  loadFolders() {
    let endpoint = `${this.auth.apiBase()}/folders/?project=${this.projectId}`;
    
    // If accessing through shared route, only load externally shared folders
    if (this.isSharedAccess) {
      endpoint += '&shared_external=true';
    }
    
    this.http.get<any[]>(endpoint).subscribe({
      next: (list) => {
        this.folders = list || [];
        // Standard: Ersten Ordner vorselektieren, falls keiner gewählt
        if (this.selectedFolderId == null && this.folders.length) {
          this.selectedFolderId = this.folders[0].id;
        }
      },
      error: () => {}
    });
  }

  loadFiles() {
    const base = this.viewTrash ? `${this.auth.apiBase()}/files/trash/` : `${this.auth.apiBase()}/files/`;
    let endpoint = `${base}?project=${this.projectId}`;
    
    // If accessing through shared route, only load files from externally shared folders
    if (this.isSharedAccess) {
      endpoint += '&shared_external=true';
    }
    
    this.http.get<any[]>(endpoint).subscribe({ 
      next: (list) => this.files = list, 
      error: () => this.toast.error('Dateien laden fehlgeschlagen') 
    });
  }

  download(f: any) {
    this.http.get(`${this.auth.apiBase()}/files/${f.id}/download/`, { responseType: 'blob', observe: 'response' })
      .subscribe(res => {
        const blob = res.body as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.original_name || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
  }

  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const form = new FormData();
    form.append('project', this.projectId);
    if (this.selectedFolderId != null) form.append('folder', String(this.selectedFolderId));
    form.append('file', file, file.name);
    form.append('original_name', file.name);
    this.http.post(`${this.auth.apiBase()}/files/`, form).subscribe({
      next: () => { this.toast.success('Upload erfolgreich'); this.loadFiles(); },
      error: () => this.toast.error('Upload fehlgeschlagen')
    });
    input.value = '';
  }

  folderNameById(id: number | null | undefined) {
    if (id == null) return '';
    const n = this.folders.find(f => Number(f.id) === Number(id));
    return n ? n.name : '';
  }

  startRename(f: any) {
    f._renaming = true;
    f._newName = f.original_name;
  }

  rename(f: any) {
    const name = (f._newName || '').trim();
    if (!name || name === f.original_name) { f._renaming=false; return; }
    this.http.patch(`${this.auth.apiBase()}/files/${f.id}/`, { original_name: name })
      .subscribe({ next: () => { this.toast.success('Dateiname aktualisiert'); f._renaming=false; this.loadFiles(); }, error: () => this.toast.error('Umbenennen fehlgeschlagen') });
  }

  openRenameModal(f: any) {
    this.renameTarget = f;
    this.renameName = f.original_name;
    // Bootstrap Modal öffnen
    const modalEl = document.getElementById('renameModal');
    if (modalEl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bs: any = (window as any).bootstrap;
      if (bs?.Modal) {
        const m = bs.Modal.getOrCreateInstance(modalEl);
        m.show();
      }
    }
  }

  confirmRename() {
    if (!this.renameTarget) return;
    const name = (this.renameName || '').trim();
    if (!name || name === this.renameTarget.original_name) return;
    this.http.patch(`${this.auth.apiBase()}/files/${this.renameTarget.id}/`, { original_name: name })
      .subscribe({
        next: () => {
          this.toast.success('Dateiname aktualisiert');
          this.loadFiles();
          const modalEl = document.getElementById('renameModal');
          if (modalEl) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bs: any = (window as any).bootstrap;
            bs?.Modal?.getOrCreateInstance(modalEl)?.hide();
          }
        },
        error: () => this.toast.error('Umbenennen fehlgeschlagen')
      });
  }

  replaceFile(evt: Event, f: any) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('original_name', file.name);
    // project bleibt gleich; Backend verhindert Projektwechsel
    this.http.patch(`${this.auth.apiBase()}/files/${f.id}/`, form)
      .subscribe({ next: () => { this.toast.success('Datei ersetzt'); this.loadFiles(); }, error: () => this.toast.error('Ersetzen fehlgeschlagen') });
    input.value = '';
  }

  remove(f: any) {
    if (!confirm('Datei wirklich löschen?')) return;
    // Soft-Delete
    this.http.delete(`${this.auth.apiBase()}/files/${f.id}/`)
      .subscribe({ next: () => { this.toast.success('Datei in den Papierkorb verschoben'); this.loadFiles(); }, error: () => this.toast.error('Löschen fehlgeschlagen') });
  }

  restore(f: any) {
    this.http.post(`${this.auth.apiBase()}/files/${f.id}/restore/`, {})
      .subscribe({ next: () => { this.toast.success('Datei wiederhergestellt'); this.loadFiles(); }, error: () => this.toast.error('Wiederherstellen fehlgeschlagen') });
  }

  purge(f: any) {
    if (!confirm('Datei endgültig löschen?')) return;
    this.http.delete(`${this.auth.apiBase()}/files/${f.id}/purge/`)
      .subscribe({ next: () => { this.toast.success('Datei endgültig gelöscht'); this.loadFiles(); }, error: () => this.toast.error('Endgültiges Löschen fehlgeschlagen') });
  }

  purgeTrash() {
    if (!confirm('Papierkorb wirklich leeren?')) return;
    this.http.delete(`${this.auth.apiBase()}/files/trash/purge/?project=${this.projectId}`)
      .subscribe({ next: (res: any) => { this.toast.success(`Papierkorb geleert (${res?.purged ?? 0})`); this.loadFiles(); }, error: () => this.toast.error('Papierkorb leeren fehlgeschlagen') });
  }

  get filteredFiles() {
    const q = (this.q || '').toLowerCase();
    // Nach Ordner filtern (nur wenn nicht Papierkorb-Ansicht)
    const base = (this.viewTrash || this.selectedFolderId == null)
      ? this.files
      : this.files.filter(f => Number(f.folder) === Number(this.selectedFolderId));
    const list = q ? base.filter(f => (f.original_name || '').toLowerCase().includes(q)) : base;
    const start = (this.page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages() {
    const q = (this.q || '').toLowerCase();
    const base = (this.viewTrash || this.selectedFolderId == null)
      ? this.files
      : this.files.filter(f => Number(f.folder) === Number(this.selectedFolderId));
    const count = (q ? base.filter(f => (f.original_name || '').toLowerCase().includes(q)) : base).length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  }

  getFileIcon(file: any): string {
    const fileName = (file.original_name || '').toLowerCase();
    const ext = fileName.split('.').pop();
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext || '')) {
      return 'bi-camera-video-fill';
    }
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext || '')) {
      return 'bi-image-fill';
    }
    
    // Document files
    if (['pdf'].includes(ext || '')) {
      return 'bi-file-pdf-fill';
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return 'bi-file-word-fill';
    }
    if (['xls', 'xlsx'].includes(ext || '')) {
      return 'bi-file-excel-fill';
    }
    if (['ppt', 'pptx'].includes(ext || '')) {
      return 'bi-file-ppt-fill';
    }
    if (['txt', 'md', 'rtf'].includes(ext || '')) {
      return 'bi-file-text-fill';
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext || '')) {
      return 'bi-file-zip-fill';
    }
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext || '')) {
      return 'bi-file-music-fill';
    }
    
    // Code files
    if (['js', 'ts', 'html', 'css', 'scss', 'json', 'xml', 'yml', 'yaml', 'py', 'java', 'cpp', 'c', 'php', 'rb'].includes(ext || '')) {
      return 'bi-file-code-fill';
    }
    
    // Default file icon
    return 'bi-file-earmark-fill';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
