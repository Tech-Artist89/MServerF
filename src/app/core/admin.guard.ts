import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const deny: UrlTree = router.createUrlTree(['/']);
  if (!auth.accessToken()) return router.createUrlTree(['/login']);

  const me = auth.me();
  if (me) {
    return (me.is_staff === true || me.profile?.role === 'admin') ? true : deny;
  }

  return auth.loadMe().pipe(
    map((m: any) => {
      auth.me.set(m);
      return (m.is_staff === true || m.profile?.role === 'admin') ? true : deny;
    }),
    catchError(() => of(deny))
  );
};
