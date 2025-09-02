import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-detail-admin.component.html',
  styleUrl: './project-detail-admin.component.scss'
})
export class ProjectDetailAdminComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  projectId!: number;
  users: any[] = [];
  companies: any[] = [];
  memberships: any[] = [];
  access: any[] = [];
  membershipForm: any = { user: null, can_read: true, can_write: false };
  accessForm: any = { company: null, can_read: true, can_write: false };

  ngOnInit() {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAll();
  }

  loadAll() {
    this.http.get<any[]>(`${this.auth.apiBase()}/users/`).subscribe({ next: (u) => this.users = u, error: () => this.toast.error('Benutzer laden fehlgeschlagen') });
    this.http.get<any[]>(`${this.auth.apiBase()}/companies/`).subscribe({ next: (c) => this.companies = c, error: () => this.toast.error('Firmen laden fehlgeschlagen') });
    this.http.get<any[]>(`${this.auth.apiBase()}/project-memberships/?project=${this.projectId}`).subscribe({ next: (m) => this.memberships = m, error: () => this.toast.error('Mitglieder laden fehlgeschlagen') });
    this.http.get<any[]>(`${this.auth.apiBase()}/project-access/?project=${this.projectId}`).subscribe({ next: (a) => this.access = a, error: () => this.toast.error('Firmenzugriffe laden fehlgeschlagen') });
  }

  username(id: number) { return this.users.find(u => u.id === id)?.username || id; }
  companyName(id: number) { return this.companies.find(c => c.id === id)?.name || id; }

  addMembership() {
    const payload = { ...this.membershipForm, project: this.projectId };
    this.http.post(`${this.auth.apiBase()}/project-memberships/`, payload).subscribe({ next: () => { this.toast.success('Mitglied hinzugefügt'); this.membershipForm = { user: null, can_read: true, can_write: false }; this.loadAll(); }, error: () => this.toast.error('Hinzufügen fehlgeschlagen') });
  }
  removeMembership(m: any) {
    this.http.delete(`${this.auth.apiBase()}/project-memberships/${m.id}/`).subscribe({ next: () => { this.toast.success('Mitglied entfernt'); this.loadAll(); }, error: () => this.toast.error('Entfernen fehlgeschlagen') });
  }

  addAccess() {
    const payload = { ...this.accessForm, project: this.projectId };
    this.http.post(`${this.auth.apiBase()}/project-access/`, payload).subscribe({ next: () => { this.toast.success('Firmenzugriff hinzugefügt'); this.accessForm = { company: null, can_read: true, can_write: false }; this.loadAll(); }, error: () => this.toast.error('Hinzufügen fehlgeschlagen') });
  }
  removeAccess(a: any) {
    this.http.delete(`${this.auth.apiBase()}/project-access/${a.id}/`).subscribe({ next: () => { this.toast.success('Firmenzugriff entfernt'); this.loadAll(); }, error: () => this.toast.error('Entfernen fehlgeschlagen') });
  }
}
