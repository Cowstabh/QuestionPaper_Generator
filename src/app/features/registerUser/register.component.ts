import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  showPassword = false; // 🟢 Added state for password visibility toggle

  private apiUrl = `${environment.apiUrl}/auth/register`;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // 🟢 Toggle visibility handler
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onRegisterSubmit() {
    const payload = {
      email: this.email,
      password: this.password,
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Registration successful! Check your email.';
        this.errorMessage = '';
        
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('verifyEmail', payload.email); 
        }
        
        setTimeout(() => this.router.navigate(['/verify']), 1500); 
      },
      error: (err) => {
        console.error('Registration error:', err);
        
        if (err instanceof Error) {
          this.errorMessage = err.message.replace('Error: ', '');
        } else if (err?.error?.message) {
          this.errorMessage = err.error.message; 
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      }
    });
  }
}