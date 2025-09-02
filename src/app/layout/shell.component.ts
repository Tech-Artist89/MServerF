import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { ToastsComponent } from '../shared/toasts.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf, ToastsComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  ngOnInit() {
    if (this.auth.isAccessTokenValid && !this.auth.me()) {
      this.auth.loadMe().subscribe({ next: (me) => this.auth.me.set(me), error: () => {} });
    }
  }
}
