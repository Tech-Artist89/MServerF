import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';

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
  projects: any[] = [];
  Math = Math;
  q = '';
  page = 1;
  pageSize = 10;
  viewMode = 'projects'; // 'projects', 'favorites', 'shared', 'trash'

  ngOnInit() {
    // Determine view mode from route
    const url = this.route.snapshot.url;
    if (url.length > 0) {
      this.viewMode = url[0].path; // 'projects', 'favorites', 'shared', 'trash'
    }
    
    this.loadProjects();
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
      }, 
      error: () => this.toast.error('Projekte laden fehlgeschlagen') 
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
