import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, throwError } from 'rxjs';

// Samma inloggning som admin på jarllindquist.com: magiska länken sparar sessionen i
// localStorage under 'admin_session_id', och dashboarden körs på samma domän (/bookmarks).
const SESSION_KEY = 'admin_session_id';
const N8N_BASE = 'https://jarllindquist.com/n8n/';

@Injectable({ providedIn: 'root' })
export class AdminSessionState {
  // true när n8n har svarat 401: sessionen saknas eller har gått ut
  loginRequired = signal(false);
  readonly loginUrl = 'https://jarllindquist.com/admin';
}

export const adminSessionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(N8N_BASE)) return next(req);

  const state = inject(AdminSessionState);
  let session = '';
  try {
    session = localStorage.getItem(SESSION_KEY) || '';
  } catch {
    // localStorage kan vara blockerat; då svarar n8n 401 och bannern visas
  }

  return next(req.clone({ setHeaders: { 'X-Admin-Session': session } })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) state.loginRequired.set(true);
      return throwError(() => err);
    })
  );
};
