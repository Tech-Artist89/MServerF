import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './projects-admin.component.html',
  styleUrl: './projects-admin.component.scss'
})
export class ProjectsAdminComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  projects: any[] = [];
  companies: any[] = [];
  creating = false;
  form: any = { name: '', description: '', owner_company: null };
  q = '';
  page = 1;
  pageSize = 10;
  Math = Math;

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any[]>(`${this.auth.apiBase()}/projects/`).subscribe({ next: (p) => this.projects = p, error: () => this.toast.error('Projekte laden fehlgeschlagen') });
    this.http.get<any[]>(`${this.auth.apiBase()}/companies/`).subscribe({ next: (c) => this.companies = c, error: () => this.toast.error('Firmen laden fehlgeschlagen') });
  }
  companyName(id: number) { return this.companies.find(c => c.id === id)?.name || id; }
  create() {
    this.http.post(`${this.auth.apiBase()}/projects/`, this.form).subscribe({ next: () => { this.toast.success('Projekt angelegt'); this.creating=false; this.form={name:'',description:'',owner_company:null}; this.load(); }, error: () => this.toast.error('Anlegen fehlgeschlagen') });
  }
  remove(p: any) {
    if (!confirm('Wirklich löschen?')) return;
    this.http.delete(`${this.auth.apiBase()}/projects/${p.id}/`).subscribe({ next: () => { this.toast.success('Projekt gelöscht'); this.load(); }, error: () => this.toast.error('Löschen fehlgeschlagen') });
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
