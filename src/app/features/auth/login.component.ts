import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = false;
  error: string | null = null;

  onSubmit() {
    this.loading = true; this.error = null;
    this.auth.login(this.username, this.password).subscribe({
      next: (tokens: any) => {
        this.auth.saveTokens(tokens);
        this.auth.loadMe().subscribe({ next: (me) => this.auth.me.set(me) });
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.error = 'Login fehlgeschlagen';
        this.loading = false;
      }
    });
  }
}
