import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorDetail = 'An unexpected issue occurred.';

        // Extract the backend's specific message (works for both 400 and 500 errors)
        if (error.error) {
          if (typeof error.error === 'string') {
            errorDetail = error.error;
          } else if (error.error.message) {
            errorDetail = error.error.message;
          } else if (error.error.detail) {
            errorDetail = error.error.detail;
          }
        } else if (error.message) {
          errorDetail = error.message;
        }

        // Pass a clean error object containing the exact backend text forward to the component
        const customError = new Error(errorDetail);
        return throwError(() => customError);
      })
    );
  }
}