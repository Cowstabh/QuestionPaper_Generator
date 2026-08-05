import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-past-papers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './past-papers.component.html',
  styleUrls: ['./past-papers.component.css']
})
export class PastPapersComponent implements OnInit {
  paperHistory: any[] = [];
  isLoading = false; // 🟢 Added missing property
  errorMessage = '';
  successMessage = '';

  private historyUrl = `${environment.apiUrl}/papers/history`;
  private historyDownloadUrl = `${environment.apiUrl}/papers/history/download`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  private getAuthHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() { 
    this.loadHistory(); 
  }

  loadHistory() {
    this.isLoading = true; // 🟢 Turn on loading overlay
    this.errorMessage = '';
    this.successMessage = '';

    this.http.get<any[]>(this.historyUrl, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (data) => {
          this.paperHistory = data;
          this.isLoading = false; // 🟢 Turn off loading overlay
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load history', err);
          this.errorMessage = 'Failed to load past papers.';
          this.isLoading = false; // 🟢 Turn off loading overlay on error
          this.cdr.detectChanges();
        }
      });
  }

  downloadFromHistory(paper: any) {
    this.isLoading = true; // 🟢 Turn on loading overlay during download
    this.successMessage = 'Re-building document...';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get(`${this.historyDownloadUrl}/${paper.id}`, { headers: this.getAuthHeaders(), responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${paper.subject || 'Question'}_Paper.docx`;
          a.click();
          window.URL.revokeObjectURL(url);
          
          this.successMessage = 'Downloaded successfully!';
          this.isLoading = false; // 🟢 Turn off loading overlay
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to download from history', err);
          this.errorMessage = 'Error downloading past paper.';
          this.isLoading = false; // 🟢 Turn off loading overlay on error
          this.cdr.detectChanges();
        }
      });
  }
}