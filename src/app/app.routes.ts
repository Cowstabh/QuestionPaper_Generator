import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/registerUser/register.component';
import { VerifyComponent } from './features/verify/verify.component';
import { DashboardLayoutComponent } from './features/dashboard/dashboard-layout/dashboard-layout.component';
import { DraftPaperComponent } from './features/dashboard/draft/draft-paper.component';
import { PastPapersComponent } from './features/dashboard/past/past-papers.component';
import { ReviewAuditComponent } from './features/dashboard/review/review-audit.component';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify', component: VerifyComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'draft', component: DraftPaperComponent },
      { path: 'history', component: PastPapersComponent },
      { path: 'review', component: ReviewAuditComponent },
      { path: '', redirectTo: 'draft', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];