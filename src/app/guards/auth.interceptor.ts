import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Ensure we are in the browser (prevents SSR crashes)
  if (typeof window !== 'undefined') {
    
    // 2. Grab your exact token key
    const token = localStorage.getItem('accessToken'); 

    // 3. If a token exists, clone the request and attach the Bearer header
    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      // Send the modified request to Spring Boot
      return next(authReq); 
    }
  }

  // If no token (or running on server), send the original request naked
  return next(req);
};