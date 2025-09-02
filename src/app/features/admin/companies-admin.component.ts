import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies-admin.component.html',
  styleUrl: './companies-admin.component.scss'
})
export class CompaniesAdminComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  companies: any[] = [];
  creating = false;
  form = { name: '', type: 'internal', active: true } as any;
  q = '';
  page = 1;
  pageSize = 10;
  Math = Math;

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any[]>(`${this.auth.apiBase()}/companies/`).subscribe({ next: (list) => this.companies = list, error: () => this.toast.error('Firmen laden fehlgeschlagen') });
  }

  startCreate() { this.creating = true; }
  cancelCreate() { this.creating = false; this.form = { name: '', type: 'internal', active: true }; }
  create() {
    this.http.post(`${this.auth.apiBase()}/companies/`, this.form).subscribe({ next: () => { this.toast.success('Firma angelegt'); this.cancelCreate(); this.load(); }, error: () => this.toast.error('Anlegen fehlgeschlagen') });
  }
  save(c: any) {
    this.http.put(`${this.auth.apiBase()}/companies/${c.id}/`, c).subscribe({ next: () => { this.toast.success('Firma gespeichert'); this.load(); }, error: () => this.toast.error('Speichern fehlgeschlagen') });
  }
  remove(c: any) {
    if (!confirm('Wirklich löschen?')) return;
    this.http.delete(`${this.auth.apiBase()}/companies/${c.id}/`).subscribe({ next: () => { this.toast.success('Firma gelöscht'); this.load(); }, error: () => this.toast.error('Löschen fehlgeschlagen') });
  }

  get filteredCompanies() {
    const q = (this.q || '').toLowerCase();
    const list = q ? this.companies.filter(c => (c.name || '').toLowerCase().includes(q)) : this.companies;
    const start = (this.page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }
  
  get totalPages() {
    const count = (this.q ? this.companies.filter(c => (c.name || '').toLowerCase().includes(this.q.toLowerCase())) : this.companies).length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  }
}
