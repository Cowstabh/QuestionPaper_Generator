import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export class AuthGuard {
  static canActivate: CanActivateFn = () => {
    const router = inject(Router);
    const token = localStorage.getItem('accessToken');

    if (token) {
      return true; // Token exists, allow access to Dashboard
    } else {
      router.navigate(['/login']); // No token, force back to Login
      return false;
    }
  };
}