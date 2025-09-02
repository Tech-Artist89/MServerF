import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-admin.component.html',
  styleUrl: './users-admin.component.scss'
})
export class UsersAdminComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  users: any[] = [];
  companies: any[] = [];
  creating = false;
  form: any = { username: '', email: '', password: '', is_staff: false, role: 'employee', company: null };
  // Filter & Pagination
  q = '';
  page = 1;
  pageSize = 10;
  Math = Math;

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<any[]>(`${this.auth.apiBase()}/users/`).subscribe({ next: (u) => this.users = u, error: () => this.toast.error('Benutzer laden fehlgeschlagen') });
    this.http.get<any[]>(`${this.auth.apiBase()}/companies/`).subscribe({ next: (c) => this.companies = c, error: () => this.toast.error('Firmen laden fehlgeschlagen') });
  }

  save(u: any) {
    const payload: any = { is_staff: !!u.is_staff };
    if (u.profile) payload.profile = { role: u.profile.role, company: u.profile.company };
    this.http.patch(`${this.auth.apiBase()}/admin/users/${u.id}/`, payload).subscribe({
      next: () => { this.toast.success('Benutzer gespeichert'); this.load(); },
      error: () => this.toast.error('Speichern fehlgeschlagen')
    });
  }

  setPassword(u: any) {
    if (!u._newPassword) return;
    this.http.patch(`${this.auth.apiBase()}/admin/users/${u.id}/`, { password: u._newPassword })
      .subscribe({ next: () => { u._newPassword = ''; this.toast.success('Passwort gesetzt'); }, error: () => this.toast.error('Passwort setzen fehlgeschlagen') });
  }

  startCreate() { this.creating = true; }
  cancelCreate() { this.creating = false; this.form = { username: '', email: '', password: '', is_staff: false, role: 'employee', company: null }; }
  create() {
    const payload = {
      username: this.form.username,
      email: this.form.email,
      password: this.form.password,
      is_staff: !!this.form.is_staff,
      profile: { role: this.form.role, company: this.form.company }
    };
    this.http.post(`${this.auth.apiBase()}/admin/users/`, payload)
      .subscribe({ next: () => { this.toast.success('Benutzer angelegt'); this.cancelCreate(); this.load(); }, error: () => this.toast.error('Anlegen fehlgeschlagen') });
  }

  remove(u: any) {
    if (!confirm('Benutzer wirklich löschen?')) return;
    this.http.delete(`${this.auth.apiBase()}/admin/users/${u.id}/`).subscribe({ next: () => { this.toast.success('Benutzer gelöscht'); this.load(); }, error: () => this.toast.error('Löschen fehlgeschlagen') });
  }

  get filteredUsers() {
    const q = (this.q || '').toLowerCase();
    const list = q ? this.users.filter(u => (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) : this.users;
    const start = (this.page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages() {
    const count = (this.q ? this.users.filter(u => (u.username || '').toLowerCase().includes(this.q.toLowerCase()) || (u.email || '').toLowerCase().includes(this.q.toLowerCase())) : this.users).length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  }
}
