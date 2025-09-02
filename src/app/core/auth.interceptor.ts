import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;
let queuedRequest: ((token: string | null) => void)[] = [];

function queue(fn: (t: string | null) => void) { queuedRequest.push(fn); }
function flushQueue(token: string | null) { queuedRequest.forEach(f => f(token)); queuedRequest = []; }

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const auth = inject(AuthService);
  const attach = (r: HttpRequest<any>, token: string | null) => {
    if (token && r.url.startsWith(auth.apiBase())) {
      return r.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return r;
  };

  req = attach(req, auth.accessToken());

  // Preemptive refresh if token present but expired (skip token endpoints)
  const isTokenUrl = req.url.includes('/token/');
  if (!isTokenUrl && auth.accessToken() && !auth.isAccessTokenValid && auth.refreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      const http = inject(HttpClient);
      return http.post<any>(`${auth.apiBase()}/token/refresh/`, { refresh: auth.refreshToken()! }).pipe(
        catchError((e) => {
          isRefreshing = false;
          auth.logout();
          flushQueue(null);
          return throwError(() => e);
        }),
        switchMap((tokens: any) => {
          auth.saveTokens({ access: tokens.access, refresh: auth.refreshToken()! });
          isRefreshing = false;
          flushQueue(tokens.access);
          const retried = attach(req, tokens.access);
          return next(retried);
        })
      );
    } else {
      return new Observable<HttpEvent<any>>((subscriber) => {
        queue((newToken) => {
          if (!newToken) { subscriber.error(new Error('Unauthorized')); return; }
          const retried = attach(req, newToken);
          next(retried).subscribe({
            next: (ev) => subscriber.next(ev),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        });
      });
    }
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const is401 = err.status === 401;
      const isTokenUrl = req.url.includes('/token/');
      const refresh = auth.refreshToken();
      if (!is401 || isTokenUrl || !refresh) {
        if (is401) auth.logout();
        return throwError(() => err);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        const http = inject(HttpClient);
        return http.post<any>(`${auth.apiBase()}/token/refresh/`, { refresh }).pipe(
          catchError((e) => {
            isRefreshing = false;
            auth.logout();
            flushQueue(null);
            return throwError(() => e);
          }),
          switchMap((tokens: any) => {
            auth.saveTokens({ access: tokens.access, refresh: refresh });
            isRefreshing = false;
            flushQueue(tokens.access);
            const retried = attach(req, tokens.access);
            return next(retried);
          })
        );
      } else {
        // Queue and retry once refresh completes
        return new Observable<HttpEvent<any>>((subscriber) => {
          queue((newToken) => {
            if (!newToken) {
              subscriber.error(err);
              return;
            }
            const retried = attach(req, newToken);
            next(retried).subscribe({
              next: (ev) => subscriber.next(ev),
              error: (e) => subscriber.error(e),
              complete: () => subscriber.complete(),
            });
          });
        });
      }
    })
  );
};
