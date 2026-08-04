import { Component, Inject, PLATFORM_ID, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface QuestionRow {
  sNo?: string;
  questionText: string;
  marks?: string;
  isHeader: boolean;
}

interface JobStatus {
  status: string;
  result: string;
}

interface AuditResult {
  qNo: string;
  questionText: string;
  isOutOfSyllabus: boolean;
  difficulty: string;
  cognitiveFeedback: string;
}
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnDestroy {
  // Tab Navigation State
  currentTab: 'create' | 'history' | 'review' = 'create';
  paperHistory: any[] = [];
  // 🟢 NEW: Audit Result State Variables
  hasAuditResults = false;
  auditResults: AuditResult[] = [];
  
  // Scorecard Metrics
  totalQuestions = 0;
  outOfSyllabusCount = 0;
  easyCount = 0;
  mediumCount = 0;
  hardCount = 0;
  
  paperConfig = {
    board: '',
    classLevel: '',
    subject: '',
    totalMarks: '',
    chapters: ''
  };

  // 🟢 UPDATED: Review & Audit State Variables (Separated Drag States)
  isReviewing = false;
  isDraggingPaper = false;
  isDraggingSyllabus = false;
  
  paperFile: File | null = null;
  paperRawText = '';
  
  syllabusFile: File | null = null;
  
  reviewConfig = {
    board: '',
    classLevel: '',
    subject: '',
    syllabusText: '' 
  };

  // UI State variables
  isGenerating = false;
  isPreviewMode = false;
  errorMessage = '';
  successMessage = '';

  // Data variables
  rawAiText = '';
  parsedQuestions: QuestionRow[] = [];

  // Updated async API endpoints
  private startJobUrl = 'http://13.233.120.111:8080/api/papers/preview/start';
  private statusUrl = 'http://13.233.120.111:8080/api/papers/preview/status';
  private downloadUrl = 'http://13.233.120.111:8080/api/papers/generate';
  private historyUrl = 'http://13.233.120.111:8080/api/papers/history'; 
  private historyDownloadUrl = 'http://13.233.120.111:8080/api/papers/history/download';
  private reviewUrl = 'http://13.233.120.111:8080/api/papers/review'; 

  private pollingSubscription?: Subscription;

  constructor(
    private http: HttpClient, 
    private router: Router,
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

  // Tab Switching Logic
  switchTab(tab: 'create' | 'history' | 'review') {
    this.currentTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
    
    if (tab === 'history') {
      this.loadHistory();
    }
    this.cdr.detectChanges(); 
  }

  // Fetch History from PostgreSQL
  loadHistory() {
    this.http.get<any[]>(this.historyUrl, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (data) => {
          this.paperHistory = data;
          this.cdr.detectChanges(); 
        },
        error: (err) => {
          console.error('Failed to load history', err);
          this.errorMessage = 'Failed to load past papers.';
          this.cdr.detectChanges();
        }
      });
  }

  // Regenerate DOCX cleanly without triggering a duplicate DB save
  downloadFromHistory(paper: any) {
    this.successMessage = 'Re-building your document...';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get(`${this.historyDownloadUrl}/${paper.id}`, { headers: this.getAuthHeaders(), responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${paper.subject || 'Question'}_Paper.docx`;
          a.click();
          window.URL.revokeObjectURL(url);
          
          this.successMessage = 'Document downloaded successfully!';
          this.cdr.detectChanges(); 
        },
        error: (err) => {
          console.error('Failed to download from history', err);
          this.errorMessage = 'Error downloading document.';
          this.cdr.detectChanges(); 
        }
      });
  }

  // STEP 1: Generate Preview (Starts the Job)
  previewPaper() {
    if (!this.paperConfig.board?.trim() || !this.paperConfig.classLevel?.trim() || !this.paperConfig.subject?.trim() || !String(this.paperConfig.totalMarks || '').trim()) {
      this.errorMessage = 'Please fill out all mandatory fields marked with an asterisk (*).';
      this.successMessage = '';
      this.cdr.detectChanges(); 
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges(); 

    this.http.post<{jobId: string}>(this.startJobUrl, this.paperConfig, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (response) => {
          this.pollJobStatus(response.jobId);
        },
        error: (err) => {
          console.error('Failed to start job', err);
          this.errorMessage = 'Failed to connect to the server. Please try again.';
          this.isGenerating = false;
          this.cdr.detectChanges(); 
        }
      });
  }

  // STEP 2: The Polling Loop
  private pollJobStatus(jobId: string) {
    this.pollingSubscription = interval(2000)
      .pipe(
        switchMap(() => this.http.get<JobStatus>(`${this.statusUrl}/${jobId}`, { headers: this.getAuthHeaders() }))
      )
      .subscribe({
        next: (response: JobStatus) => {
          console.log('⏱️ Backend Status Check:', response);
          if (response.status === 'COMPLETED') {
            this.stopPolling();
            
            try {
              this.rawAiText = response.result;
              this.parseRawTextForUi(this.rawAiText);
            } catch (e) {
              console.error('Error parsing AI text:', e);
            }
            
            this.isPreviewMode = true;
            this.isGenerating = false;
            this.cdr.detectChanges(); 
            
          } else if (response.status === 'FAILED') {
            this.stopPolling();
            this.errorMessage = response.result || 'An error occurred while drafting the paper.';
            this.isGenerating = false;
            this.cdr.detectChanges(); 
          }
        },
        error: (err) => {
          console.error('Polling error', err);
          this.stopPolling();
          this.errorMessage = 'Lost connection to the server while drafting.';
          this.isGenerating = false;
          this.cdr.detectChanges(); 
        }
      });
  }

  private stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  // STEP 3: Download Approved Paper (Saves to DB)
  downloadPaper() {
    this.isGenerating = true; 
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges(); 

    const payload = {
      ...this.paperConfig,
      rawText: this.rawAiText 
    };

    this.http.post(this.downloadUrl, payload, { headers: this.getAuthHeaders(), responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.paperConfig.subject || 'Question'}_Paper.docx`;
          a.click();
          window.URL.revokeObjectURL(url);
          
          this.successMessage = 'Question paper downloaded successfully!';
          this.isGenerating = false; 
          this.cdr.detectChanges(); 
        },
        error: (err) => {
          console.error('Failed to download paper', err);
          this.errorMessage = 'Error downloading document.';
          this.isGenerating = false; 
          this.cdr.detectChanges(); 
        }
      });
  }

  private parseRawTextForUi(rawText: string) {
    const lines = rawText.split('\n');
    this.parsedQuestions = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const upper = trimmed.toUpperCase();
      if (upper.startsWith("SECTION") || upper.startsWith("PART") || upper.startsWith("GROUP")) {
        this.parsedQuestions.push({ questionText: upper, isHeader: true });
        continue;
      }

      if (trimmed.includes('|')) {
        const firstPipe = trimmed.indexOf('|');
        const lastPipe = trimmed.lastIndexOf('|');

        if (firstPipe !== -1 && lastPipe !== -1 && firstPipe !== lastPipe) {
          this.parsedQuestions.push({
            sNo: trimmed.substring(0, firstPipe).trim().replace('.', ''),
            questionText: trimmed.substring(firstPipe + 1, lastPipe).trim(),
            marks: trimmed.substring(lastPipe + 1).trim(),
            isHeader: false
          });
          continue;
        }
      }

      this.parsedQuestions.push({ questionText: trimmed, isHeader: false });
    }
  }

  editCriteria() {
    this.isPreviewMode = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges(); 
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // ==========================================
  // 🟢 UPDATED: DRAG & DROP AND REVIEW LOGIC
  // ==========================================

  // --- Dynamic Form Validator ---
  get isReviewFormValid(): boolean {
    const hasBoard = !!this.reviewConfig.board;
    const hasClass = !!this.reviewConfig.classLevel;
    
    // Must have either a Syllabus file OR Syllabus text
    const hasSyllabus = !!this.syllabusFile || !!this.reviewConfig.syllabusText.trim();
    
    // Must have either a Paper file OR Paper text
    const hasPaper = !!this.paperFile || !!this.paperRawText.trim();
    
    return hasBoard && hasClass && hasSyllabus && hasPaper;
  }

  // --- Syllabus Drag & Drop ---
  onDragOverSyllabus(event: DragEvent) {
    event.preventDefault();
    this.isDraggingSyllabus = true;
  }

  onDragLeaveSyllabus(event: DragEvent) {
    event.preventDefault();
    this.isDraggingSyllabus = false;
  }

  onDropSyllabus(event: DragEvent) {
    event.preventDefault();
    this.isDraggingSyllabus = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleSyllabusFile(event.dataTransfer.files[0]);
    }
  }

  onSyllabusFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.handleSyllabusFile(event.target.files[0]);
    }
  }

  private handleSyllabusFile(file: File) {
    const validExtensions = ['.pdf', '.docx', '.xlsx'];
    const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isValid) {
      this.syllabusFile = file;
      this.reviewConfig.syllabusText = ''; // Clear text fallback if a file is uploaded
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Invalid file type for syllabus. Please upload a PDF, DOCX, or XLSX.';
    }
    this.cdr.detectChanges();
  }

  removeSyllabusFile() {
    this.syllabusFile = null;
    this.cdr.detectChanges();
  }

  // --- Question Paper Drag & Drop ---
  onDragOverPaper(event: DragEvent) {
    event.preventDefault();
    this.isDraggingPaper = true;
  }

  onDragLeavePaper(event: DragEvent) {
    event.preventDefault();
    this.isDraggingPaper = false;
  }

  onDropPaper(event: DragEvent) {
    event.preventDefault();
    this.isDraggingPaper = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handlePaperFile(event.dataTransfer.files[0]);
    }
  }

  onPaperFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.handlePaperFile(event.target.files[0]);
    }
  }

  private handlePaperFile(file: File) {
    const validExtensions = ['.pdf', '.docx', '.xlsx'];
    const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isValid) {
      this.paperFile = file;
      this.paperRawText = ''; // Clear text fallback if a file is uploaded
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Invalid file type. Please upload a PDF, DOCX, or XLSX file.';
    }
    this.cdr.detectChanges();
  }

  removePaperFile() {
    this.paperFile = null;
    this.cdr.detectChanges();
  }

  submitReview() {
    // 1. Validation Checks (Using the new strict getter)
    if (!this.isReviewFormValid) {
      this.errorMessage = 'Please fill out all mandatory fields and provide both a Syllabus and Question Paper.';
      this.cdr.detectChanges();
      return;
    }

    // 2. Start Loading State
    this.isReviewing = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    // 3. Package the FormData
    const formData = new FormData();
    formData.append('board', this.reviewConfig.board);
    formData.append('classLevel', this.reviewConfig.classLevel);
    formData.append('subject', this.reviewConfig.subject);
    
    if (this.reviewConfig.syllabusText.trim()) {
      formData.append('syllabusText', this.reviewConfig.syllabusText);
    }
    if (this.syllabusFile) {
      formData.append('syllabusFile', this.syllabusFile);
    }
    
    if (this.paperFile) {
      formData.append('paperFile', this.paperFile);
    }
    if (this.paperRawText.trim()) {
      formData.append('paperText', this.paperRawText);
    }

   // 4. Send to Backend
    this.http.post(this.reviewUrl, formData, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (response: any) => {
          console.log('✅ AI Audit Response:', response);
          
          this.auditResults = response;
          this.calculateMetrics();
          this.hasAuditResults = true;
          
          this.successMessage = 'Audit complete! Review the findings below.';
          this.isReviewing = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Review failed', err);
          
          let extractedMessage = 'An unexpected error occurred while processing your documents.';

          if (err.error) {
            if (typeof err.error === 'string') {
              // Handles plain text responses or Spring Boot error strings
              extractedMessage = err.error;
            } else if (err.error.error) {
              // Handles JSON responses like: {"error": "Document A is an Economics syllabus..."}
              extractedMessage = err.error.error;
            } else if (err.error.message) {
              // Handles standard Spring Boot JSON exception payloads
              extractedMessage = err.error.message;
            }
          } else if (err.message) {
            extractedMessage = err.message;
          }

          // Push the message into the UI error state
          this.errorMessage = extractedMessage;
          this.isReviewing = false;
          this.cdr.detectChanges();
        }
      });
  }

  // 🟢 NEW: Helper Methods for the Dashboard
  calculateMetrics() {
    this.totalQuestions = this.auditResults.length;
    this.outOfSyllabusCount = this.auditResults.filter(r => r.isOutOfSyllabus).length;
    this.easyCount = this.auditResults.filter(r => r.difficulty.toLowerCase() === 'easy').length;
    this.mediumCount = this.auditResults.filter(r => r.difficulty.toLowerCase() === 'medium').length;
    this.hardCount = this.auditResults.filter(r => r.difficulty.toLowerCase() === 'hard').length;
  }

  resetAudit() {
    this.hasAuditResults = false;
    this.auditResults = [];
    this.paperFile = null;
    this.paperRawText = '';
    this.syllabusFile = null;
    this.reviewConfig.syllabusText = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }
}