import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  mobileNumber = '';
  password = '';
  errorMessage = '';
  successMessage = '';

  private apiUrl = `${environment.apiUrl}/auth/register`;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  onRegisterSubmit() {

    // 2. Construct a single payload using your component's properties
    const payload = {
      email: this.email,
      password: this.password,
    };

    // 3. Make the HTTP request
    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Registration successful! Check your email.';
        this.errorMessage = '';
        
        // 🟢 Safely store the email only if running in the browser
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('verifyEmail', payload.email); 
        }
        
        // Route to verify page
        setTimeout(() => this.router.navigate(['/verify']), 1500); 
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed.';
        this.successMessage = '';
      }
    });
  }
}