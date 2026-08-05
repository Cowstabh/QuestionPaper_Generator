import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Check if running in the browser environment
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('accessToken');
    
    // If the token exists and is valid, allow access
    if (token && token.trim() !== '') {
      return true;
    }
  }

  // If no token exists, redirect unauthorized users to the login page
  return router.parseUrl('/login');
};