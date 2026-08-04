import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http'; 
import { routes } from './app.routes';
import { ErrorInterceptor } from './error/error.interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    
    // Combine withFetch and withInterceptorsFromDi
    provideHttpClient(
      withFetch(), 
      withInterceptorsFromDi() 
    ),
    
    // Register the custom error interceptor
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
};