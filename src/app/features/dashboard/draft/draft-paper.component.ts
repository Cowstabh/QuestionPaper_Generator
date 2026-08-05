import { Component, Inject, PLATFORM_ID, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface QuestionRow { sNo?: string; questionText: string; marks?: string; isHeader: boolean; }
interface JobStatus { status: string; result: string; }

@Component({
  selector: 'app-draft-paper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './draft-paper.component.html',
  styleUrls: ['./draft-paper.component.css']
})
export class DraftPaperComponent implements OnDestroy {
  paperConfig = { board: '', classLevel: '', subject: '', totalMarks: '', chapters: '' };
  
  // File Upload State
  referenceFile: File | null = null;
  isDraggingReference = false;

  isGenerating = false;
  isPreviewMode = false;
  successMessage = '';
  errorMessage = '';
  rawAiText = '';
  parsedQuestions: QuestionRow[] = [];

  private startJobUrl = `${environment.apiUrl}/papers/preview/start`;
  private statusUrl = `${environment.apiUrl}/papers/preview/status`;
  private downloadUrl = `${environment.apiUrl}/papers/generate`;
  private pollingSubscription?: Subscription;

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

  // --- Drag & Drop Handlers for Reference Document ---
  onDragOverReference(event: DragEvent) {
    event.preventDefault();
    this.isDraggingReference = true;
  }

  onDragLeaveReference(event: DragEvent) {
    event.preventDefault();
    this.isDraggingReference = false;
  }

  onDropReference(event: DragEvent) {
    event.preventDefault();
    this.isDraggingReference = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleReferenceFile(event.dataTransfer.files[0]);
    }
  }

  onReferenceFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.handleReferenceFile(event.target.files[0]);
    }
  }

  private handleReferenceFile(file: File) {
    const validExtensions = ['.pdf', '.docx', '.xlsx'];
    const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isValid) {
      this.referenceFile = file;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Invalid file type. Please upload a PDF, DOCX, or XLSX file.';
    }
    this.cdr.detectChanges();
  }

  removeReferenceFile() {
    this.referenceFile = null;
    this.cdr.detectChanges();
  }

  // STEP 1: Generate Preview (Sends Form Data including file)
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

    const formData = new FormData();
    formData.append('board', this.paperConfig.board);
    formData.append('classLevel', this.paperConfig.classLevel);
    formData.append('subject', this.paperConfig.subject);
    formData.append('totalMarks', String(this.paperConfig.totalMarks));
    formData.append('chapters', this.paperConfig.chapters || '');
    
    if (this.referenceFile) {
      formData.append('referenceFile', this.referenceFile);
    }

    this.http.post<{jobId: string}>(this.startJobUrl, formData, { headers: this.getAuthHeaders() })
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
          if (response.status === 'COMPLETED') {
            this.stopPolling();
            this.rawAiText = response.result;
            this.parseRawTextForUi(this.rawAiText);
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
}