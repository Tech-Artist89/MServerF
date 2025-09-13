import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 1;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', timeoutMs = 3000) {
    const id = this.seq++;
    const t = { id, type, message } as Toast;
    this.toasts.update(list => [...list, t]);
    if (timeoutMs > 0) setTimeout(() => this.dismiss(id), timeoutMs);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error', 5000); }
  info(msg: string) { this.show(msg, 'info'); }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(x => x.id !== id));
  }
}

