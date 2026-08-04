import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // 🟢 Import isPlatformBrowser
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.css']
})
export class VerifyComponent {
  email = '';
  code = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  private apiUrl = 'http://13.233.120.111:8080/api/auth/verify';

  // 🟢 Inject PLATFORM_ID to detect the environment
  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // 🟢 Only run this if we are in the browser!
    if (isPlatformBrowser(this.platformId)) {
      this.email = localStorage.getItem('verifyEmail') || '';
      
      if (!this.email) {
        this.router.navigate(['/login']);
      }
    }
  }

  onVerifySubmit() {
    if (!this.code) {
      this.errorMessage = 'Please enter the verification code.';
      return;
    }

    this.isLoading = true;
    const payload = {
      email: this.email,
      code: this.code.trim()
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Verification successful!';
        this.errorMessage = '';
        
        // 🟢 Check platform before removing items
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('verifyEmail'); 
        }
        
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Invalid verification code. Please try again.';
        this.successMessage = '';
        this.isLoading = false;
      }
    });
  }
}