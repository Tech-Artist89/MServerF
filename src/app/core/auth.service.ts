import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface TokenResponse { access: string; refresh: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly apiBase = signal<string>(environment.apiBase);
  readonly accessToken = signal<string | null>(localStorage.getItem('access'));
  readonly refreshToken = signal<string | null>(localStorage.getItem('refresh'));
  readonly me = signal<any | null>(null);

  get isAuthenticated() { return !!this.accessToken(); }

  private decodeJwt(token: string | null): any | null {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  get isAccessTokenValid(): boolean {
    const t = this.accessToken();
    if (!t) return false;
    const payload = this.decodeJwt(t);
    if (!payload || typeof payload.exp !== 'number') return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now + 5; // small leeway
  }

  login(username: string, password: string) {
    return this.http.post<TokenResponse>(`${this.apiBase()}/token/`, { username, password });
  }

  saveTokens(tokens: TokenResponse) {
    this.accessToken.set(tokens.access);
    this.refreshToken.set(tokens.refresh);
    localStorage.setItem('access', tokens.access);
    localStorage.setItem('refresh', tokens.refresh);
  }

  logout() {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    this.me.set(null);
    this.router.navigateByUrl('/login');
  }

  loadMe() {
    return this.http.get(`${this.apiBase()}/me/`);
  }
}
