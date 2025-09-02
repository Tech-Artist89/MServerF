import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.accessToken()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.isAccessTokenValid) {
    // Token present but invalid/expired: clean up and redirect
    auth.logout();
    return router.createUrlTree(['/login']);
  }
  return true;
};
