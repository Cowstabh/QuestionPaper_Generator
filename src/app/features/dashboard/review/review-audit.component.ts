import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AuditResult { qNo: string; questionText: string; isOutOfSyllabus: boolean; difficulty: string; cognitiveFeedback: string; }

@Component({
  selector: 'app-review-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-audit.component.html',
  styleUrls: ['./review-audit.component.css']
})
export class ReviewAuditComponent {
  hasAuditResults = false;
  auditResults: AuditResult[] = [];
  
  totalQuestions = 0;
  outOfSyllabusCount = 0;
  easyCount = 0; mediumCount = 0; hardCount = 0;

  isReviewing = false;
  isDraggingPaper = false;
  isDraggingSyllabus = false;
  
  paperFile: File | null = null;
  paperRawText = '';
  syllabusFile: File | null = null;
  
  reviewConfig = { board: '', classLevel: '', subject: '', syllabusText: '' };
  errorMessage = '';
  successMessage = '';

  private reviewUrl = `${environment.apiUrl}/papers/review`;

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

  get isReviewFormValid(): boolean {
    const hasBoard = !!this.reviewConfig.board;
    const hasClass = !!this.reviewConfig.classLevel;
    const hasSyllabus = !!this.syllabusFile || !!this.reviewConfig.syllabusText.trim();
    const hasPaper = !!this.paperFile || !!this.paperRawText.trim();
    return hasBoard && hasClass && hasSyllabus && hasPaper;
  }

  // --- Drag & Drop handlers ---
  onDragOverSyllabus(e: DragEvent) { e.preventDefault(); this.isDraggingSyllabus = true; }
  onDragLeaveSyllabus(e: DragEvent) { e.preventDefault(); this.isDraggingSyllabus = false; }
  onDropSyllabus(e: DragEvent) {
    e.preventDefault(); this.isDraggingSyllabus = false;
    if (e.dataTransfer?.files?.length) this.handleSyllabusFile(e.dataTransfer.files[0]);
  }
  onSyllabusFileSelected(e: any) { if (e.target.files?.length) this.handleSyllabusFile(e.target.files[0]); }
  private handleSyllabusFile(file: File) {
    if (['.pdf', '.docx', '.xlsx'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      this.syllabusFile = file; this.reviewConfig.syllabusText = ''; this.errorMessage = '';
    } else {
      this.errorMessage = 'Invalid file type for syllabus. Use PDF, DOCX, or XLSX.';
    }
    this.cdr.detectChanges();
  }
  removeSyllabusFile() { this.syllabusFile = null; this.cdr.detectChanges(); }

  onDragOverPaper(e: DragEvent) { e.preventDefault(); this.isDraggingPaper = true; }
  onDragLeavePaper(e: DragEvent) { e.preventDefault(); this.isDraggingPaper = false; }
  onDropPaper(e: DragEvent) {
    e.preventDefault(); this.isDraggingPaper = false;
    if (e.dataTransfer?.files?.length) this.handlePaperFile(e.dataTransfer.files[0]);
  }
  onPaperFileSelected(e: any) { if (e.target.files?.length) this.handlePaperFile(e.target.files[0]); }
  private handlePaperFile(file: File) {
    if (['.pdf', '.docx', '.xlsx'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      this.paperFile = file; this.paperRawText = ''; this.errorMessage = '';
    } else {
      this.errorMessage = 'Invalid file type for paper.';
    }
    this.cdr.detectChanges();
  }
  removePaperFile() { this.paperFile = null; this.cdr.detectChanges(); }

  submitReview() {
    if (!this.isReviewFormValid) {
      this.errorMessage = 'Please complete all mandatory fields and provide inputs.';
      return;
    }

    this.isReviewing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();
    formData.append('board', this.reviewConfig.board);
    formData.append('classLevel', this.reviewConfig.classLevel);
    formData.append('subject', this.reviewConfig.subject);
    if (this.reviewConfig.syllabusText.trim()) formData.append('syllabusText', this.reviewConfig.syllabusText);
    if (this.syllabusFile) formData.append('syllabusFile', this.syllabusFile);
    if (this.paperFile) formData.append('paperFile', this.paperFile);
    if (this.paperRawText.trim()) formData.append('paperText', this.paperRawText);

    this.http.post(this.reviewUrl, formData, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (res: any) => {
          this.auditResults = res;
          this.calculateMetrics();
          this.hasAuditResults = true;
          this.successMessage = 'Audit complete!';
          this.isReviewing = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.error || err.error?.message || err.error || 'Audit processing failed.';
          this.isReviewing = false;
          this.cdr.detectChanges();
        }
      });
  }

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
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }
}