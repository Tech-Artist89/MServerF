import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs-admin.component.html',
  styleUrl: './audit-logs-admin.component.scss'
})
export class AuditLogsAdminComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  logs: any[] = [];
  filter: any = { action: '', actor: '', target: '', since: '', until: '' };

  ngOnInit() { this.load(); }

  load() {
    const params = new URLSearchParams();
    if (this.filter.action) params.set('action', this.filter.action);
    if (this.filter.actor) params.set('actor', this.filter.actor);
    if (this.filter.target) params.set('target', this.filter.target);
    if (this.filter.since) params.set('since', new Date(this.filter.since).toISOString());
    if (this.filter.until) params.set('until', new Date(this.filter.until).toISOString());
    const qs = params.toString();
    this.http.get<any[]>(`${this.auth.apiBase()}/audit-logs/${qs ? '?' + qs : ''}`)
      .subscribe(list => this.logs = list as any);
  }
}
