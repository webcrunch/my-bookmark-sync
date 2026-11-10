import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const N8N_BASE = 'https://jarllindquist.com/n8n/';

// Skickar sessionen med varje anrop till n8n. 401 betyder utloggad: inloggningssidan visas.
export const adminSessionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(N8N_BASE)) return next(req);

  const auth = inject(AuthService);
  return next(req.clone({ setHeaders: { 'X-Admin-Session': auth.session() } })).pipe(
    tap(() => auth.touch()),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) auth.sessionExpired();
      return throwError(() => err);
    })
  );
};
