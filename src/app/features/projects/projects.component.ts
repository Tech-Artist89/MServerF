import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';
import { RestoredFilesTrackingService } from '../../core/restored-files-tracking.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private restoredFilesTracking = inject(RestoredFilesTrackingService);
  projects: any[] = [];
  Math = Math;
  q = '';
  page = 1;
  pageSize = 10;
  viewMode = 'projects'; // 'projects', 'favorites', 'shared', 'trash'

  ngOnInit() {
    // Determine view mode from route or query parameters
    const url = this.route.snapshot.url;
    const queryView = this.route.snapshot.queryParams['view'];

    if (queryView) {
      this.viewMode = queryView; // 'projects', 'favorites', 'shared', 'trash'
    } else if (url.length > 0) {
      this.viewMode = url[0].path; // 'projects', 'favorites', 'shared', 'trash'
    }

    this.loadProjects();

    // Listen to query parameter changes for dynamic updates
    this.route.queryParams.subscribe(params => {
      const newView = params['view'];
      if (newView && newView !== this.viewMode) {
        this.viewMode = newView;
        this.page = 1; // Reset pagination
        this.loadProjects();
      }
    });
  }

  loadProjects() {
    let endpoint = `${this.auth.apiBase()}/projects/`;

    // Adjust endpoint based on view mode
    switch (this.viewMode) {
      case 'favorites':
        endpoint += '?favorites=true';
        break;
      case 'shared':
        // Shared projects are those shared with external companies (subcontractors)
        endpoint += '?shared_external=true';
        break;
      case 'trash':
        endpoint += '?trash=true';
        break;
      case 'projects':
      default:
        // Projects view shows only own/internal projects (not external shared ones)
        break;
    }

    this.http.get<any[]>(endpoint).subscribe({
      next: (p) => {
        this.projects = p.map(project => ({
          ...project,
          is_favorite: project.is_favorite || false
        }));

        // If trash view, also load deleted files
        if (this.viewMode === 'trash') {
          this.loadDeletedFiles();
        }
      },
      error: () => this.toast.error('Projekte laden fehlgeschlagen')
    });
  }

  loadDeletedFiles() {
    // Load all deleted files to show in the trash view
    // Try multiple API endpoints to find deleted files
    const endpoints = [
      `${this.auth.apiBase()}/files/trash/`,
      `${this.auth.apiBase()}/files/?deleted=true`,
      `${this.auth.apiBase()}/files/?trash=true`
    ];

    // Try the first endpoint
    this.tryLoadDeletedFiles(endpoints, 0);
  }

  tryLoadDeletedFiles(endpoints: string[], index: number) {
    if (index >= endpoints.length) {
      // No deleted files found - this is normal after purging trash
      console.log('No deleted files found (trash may be empty)');
      return;
    }

    const endpoint = endpoints[index];
    this.http.get<any[]>(endpoint).subscribe({
      next: (files) => {

        if (!files || files.length === 0) {
          // Try next endpoint silently - empty results are normal
          this.tryLoadDeletedFiles(endpoints, index + 1);
          return;
        }

        // Success! Process the files
        this.processDeletedFiles(files);
      },
      error: (err) => {

        // Try next endpoint
        this.tryLoadDeletedFiles(endpoints, index + 1);
      }
    });
  }

  processDeletedFiles(files: any[]) {
    // Use service to filter out restored files
    const filteredFiles = this.restoredFilesTracking.filterRestoredFiles(files);

    // Group deleted files by project and add them to the projects array
    const filesByProject = filteredFiles.reduce((acc, file) => {
      const projectId = file.project || file.project_id;

      if (!projectId) {
        return acc;
      }

      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(file);
      return acc;
    }, {} as { [key: string]: any[] });

    // Add deleted files to existing projects or create virtual entries
    Object.keys(filesByProject).forEach(projectId => {
      let project = this.projects.find(p => p.id === parseInt(projectId));
      if (!project) {
        // Try to get project name from first file in the group
        const firstFile = filesByProject[projectId][0];
        let projectName = `Projekt ${projectId}`;

        // If file has project name in its data, use that
        if (firstFile && firstFile.project_name) {
          projectName = firstFile.project_name;
        }

        // Create a virtual project entry for orphaned files
        project = {
          id: parseInt(projectId),
          name: projectName,
          description: 'Gelöschte Dateien',
          deleted_files: filesByProject[projectId],
          is_virtual: true
        };
        this.projects.push(project);
      } else {
        project.deleted_files = filesByProject[projectId];
      }
    });
  }

  get isAdmin(): boolean {
    return this.auth.me()?.is_staff || this.auth.me()?.profile?.role === 'admin';
  }

  toggleFavorite(project: any) {
    const newState = !project.is_favorite;
    this.http.post(`${this.auth.apiBase()}/projects/${project.id}/favorite/`, { is_favorite: newState })
      .subscribe({
        next: (response: any) => {
          project.is_favorite = newState;
          this.toast.success(response.message || (newState ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt'));

          // If we're in favorites view and item was removed from favorites, reload
          if (this.viewMode === 'favorites' && !newState) {
            this.loadProjects();
          }
        },
        error: () => this.toast.error('Favoriten-Status konnte nicht geändert werden')
      });
  }

  restoreProject(project: any) {
    this.http.post(`${this.auth.apiBase()}/projects/${project.id}/restore/`, {})
      .subscribe({
        next: (response: any) => {
          this.toast.success(response.message || 'Projekt wiederhergestellt');
          this.loadProjects(); // Reload to remove from trash view
        },
        error: () => this.toast.error('Projekt konnte nicht wiederhergestellt werden')
      });
  }

  restoreFile(file: any) {
    console.log('Restoring file:', file.original_name, 'ID:', file.id);

    this.http.post(`${this.auth.apiBase()}/files/${file.id}/restore/`, {})
      .subscribe({
        next: (response) => {
          console.log('Restore response:', response);
          this.toast.success('Datei wiederhergestellt');

          // Mark file as restored in global tracking service
          this.restoredFilesTracking.markFileAsRestored(file.id);

          console.log('Projects before file removal:', this.projects.length);

          // Remove the file from the current projects' deleted_files arrays
          this.projects.forEach(project => {
            if (project.deleted_files) {
              const beforeCount = project.deleted_files.length;
              project.deleted_files = project.deleted_files.filter((f: any) => f.id !== file.id);
              const afterCount = project.deleted_files.length;

              console.log(`Project ${project.name}: removed ${beforeCount - afterCount} files (${beforeCount} -> ${afterCount})`);

              // If no more deleted files in this project, remove the deleted_files property
              if (project.deleted_files.length === 0) {
                console.log(`Removing deleted_files property from project: ${project.name}`);
                delete project.deleted_files;
              }
            }
          });

          // Remove virtual projects that have no more deleted files
          const beforeProjects = this.projects.length;
          this.projects = this.projects.filter(project => {
            if (project.is_virtual && (!project.deleted_files || project.deleted_files.length === 0)) {
              console.log(`Removing empty virtual project: ${project.name}`);
              return false; // Remove empty virtual projects
            }
            return true; // Keep all other projects
          });
          const afterProjects = this.projects.length;

          console.log(`Projects after cleanup: ${beforeProjects} -> ${afterProjects}`);
          console.log('Final projects state:', this.projects);

          // Force change detection by creating a new array reference
          this.projects = [...this.projects];
        },
        error: (error) => {
          console.error('Restore file error:', error);
          this.toast.error('Datei konnte nicht wiederhergestellt werden');
        }
      });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  purgeAllTrash() {
    if (!confirm('Papierkorb vollständig leeren? Alle gelöschten Dateien werden endgültig gelöscht!')) {
      return;
    }

    // Get all projects with deleted files
    const projectsWithFiles = this.projects.filter(p => p.deleted_files && p.deleted_files.length > 0);

    if (projectsWithFiles.length === 0) {
      this.toast.info('Papierkorb ist bereits leer');
      return;
    }

    let totalPurged = 0;
    let completedRequests = 0;
    const totalRequests = projectsWithFiles.length;

    // Purge trash for each project with deleted files
    projectsWithFiles.forEach(project => {
      this.http.delete(`${this.auth.apiBase()}/files/trash/purge/?project=${project.id}`)
        .subscribe({
          next: (response: any) => {
            totalPurged += response.purged || 0;
            completedRequests++;

            if (completedRequests === totalRequests) {
              this.toast.success(`Papierkorb geleert: ${totalPurged} Dateien endgültig gelöscht`);

              // Clear restored files tracking since trash was purged
              this.restoredFilesTracking.clearAll();

              // Clear all deleted_files from projects and remove virtual projects
              this.projects.forEach(project => {
                if (project.deleted_files) {
                  delete project.deleted_files;
                }
              });

              // Remove all virtual projects (they only existed for deleted files)
              this.projects = this.projects.filter(project => !project.is_virtual);
            }
          },
          error: () => {
            completedRequests++;
            this.toast.error(`Fehler beim Leeren des Papierkorbs für Projekt ${project.name}`);

            if (completedRequests === totalRequests) {
              // Even on errors, clear the UI and tracking to avoid confusion
              this.restoredFilesTracking.clearAll();
              this.projects.forEach(project => {
                if (project.deleted_files) {
                  delete project.deleted_files;
                }
              });
              this.projects = this.projects.filter(project => !project.is_virtual);
            }
          }
        });
    });
  }

  get pageTitle(): string {
    switch (this.viewMode) {
      case 'favorites': return 'Favoriten';
      case 'shared': return 'Geteilte Projekte';
      case 'trash': return 'Papierkorb';
      default: return 'Projekte';
    }
  }

  get pageIcon(): string {
    switch (this.viewMode) {
      case 'favorites': return 'bi-star-fill';
      case 'shared': return 'bi-share';
      case 'trash': return 'bi-trash';
      default: return 'bi-briefcase-fill';
    }
  }

  getProjectLink(projectId: string): string[] {
    // Return different routes based on current view mode
    switch (this.viewMode) {
      case 'shared':
        return ['/shared', projectId];
      case 'favorites':
        return ['/favorites', projectId];
      case 'trash':
        return ['/trash', projectId];
      default:
        return ['/projects', projectId];
    }
  }

  get filteredProjects() {
    const q = (this.q || '').toLowerCase();
    const list = q ? this.projects.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) : this.projects;
    const start = (this.page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages() {
    const count = (this.q ? this.projects.filter(p => (p.name || '').toLowerCase().includes(this.q.toLowerCase()) || (p.description || '').toLowerCase().includes(this.q.toLowerCase())) : this.projects).length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  }
}
