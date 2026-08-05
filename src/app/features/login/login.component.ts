import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };

  errorMessage = '';
  infoMessage = '';
  isLoading = false;
  showPassword = false; // 🟢 Added state for password visibility

  private apiUrl = `${environment.apiUrl}/auth/login`;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // 🟢 Toggle visibility handler
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    this.http.post<any>(this.apiUrl, this.credentials).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('idToken', response.idToken);
            localStorage.setItem('refreshToken', response.refreshToken);
          }

          this.isLoading = false; 
          this.router.navigate(['/dashboard']); 
        }
      },
      error: (err) => {
        if (err.status === 403 && err.error?.status === 'USER_UNCONFIRMED') {
          this.infoMessage = 'Account not verified. Redirecting to verification page...';
          
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('verifyEmail', err.error.email);
          }
          
          setTimeout(() => {
            this.router.navigate(['/verify']);
          }, 1500);
          
        } else if (err.status === 404 || err.error?.status === 'USER_NOT_FOUND') {
          this.infoMessage = 'Account does not exist. Redirecting to registration page...';
          setTimeout(() => this.router.navigate(['/register']), 2000);
        } else {
          this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        }
        this.isLoading = false;
      }
    });
  }
}