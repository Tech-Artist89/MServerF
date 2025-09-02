import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
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
  private toast = inject(ToastService);
  projects: any[] = [];
  Math = Math;
  q = '';
  page = 1;
  pageSize = 10;

  ngOnInit() {
    this.http.get<any[]>(`${this.auth.apiBase()}/projects/`).subscribe({ next: (p) => this.projects = p, error: () => this.toast.error('Projekte laden fehlgeschlagen') });
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
