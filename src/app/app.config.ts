import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
// 🟢 Ensure withInterceptors is imported from @angular/common/http
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'; 
// 🟢 Import the file you just created
import { authInterceptor } from './guards/auth.interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 🟢 Register the interceptor here
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])) 
  ]
};