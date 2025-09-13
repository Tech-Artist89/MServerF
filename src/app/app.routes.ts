import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [() => import('./core/auth.guard').then(m => m.authGuard)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'projects', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'projects/:id', loadComponent: () => import('./features/files/file-browser.component').then(m => m.FileBrowserComponent) },
      { path: 'shared', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'shared/:id', loadComponent: () => import('./features/files/file-browser.component').then(m => m.FileBrowserComponent), data: { shared: true } },
      { path: 'favorites', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'favorites/:id', loadComponent: () => import('./features/files/file-browser.component').then(m => m.FileBrowserComponent) },
      { path: 'trash', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'admin', canActivate: [() => import('./core/admin.guard').then(m => m.adminGuard)], children: [
        { path: '', pathMatch: 'full', redirectTo: 'companies' },
        { path: 'users', loadComponent: () => import('./features/admin/users-admin.component').then(m => m.UsersAdminComponent) },
        { path: 'companies', loadComponent: () => import('./features/admin/companies-admin.component').then(m => m.CompaniesAdminComponent) },
        { path: 'projects', loadComponent: () => import('./features/admin/projects-admin.component').then(m => m.ProjectsAdminComponent) },
        { path: 'projects/:id', loadComponent: () => import('./features/admin/project-detail-admin.component').then(m => m.ProjectDetailAdminComponent) },
        { path: 'audit-logs', loadComponent: () => import('./features/admin/audit-logs-admin.component').then(m => m.AuditLogsAdminComponent) }
      ]}
    ]
  },
  { path: '**', redirectTo: '' }
];
