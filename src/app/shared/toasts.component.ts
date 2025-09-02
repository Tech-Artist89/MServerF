import { Component, inject } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [NgFor, NgClass],
  template: `
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div class="toast show mb-2" *ngFor="let t of toast.toasts()" [ngClass]="{'text-bg-success': t.type==='success', 'text-bg-danger': t.type==='error', 'text-bg-secondary': t.type==='info'}">
      <div class="d-flex">
        <div class="toast-body">{{ t.message }}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close" (click)="toast.dismiss(t.id)"></button>
      </div>
    </div>
  </div>
  `
})
export class ToastsComponent {
  toast = inject(ToastService);
}

