import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CheckoutStateService } from './services/checkout-state.service';
import { environment } from '../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly checkoutState: CheckoutStateService,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.resolveAuthToken(req.url);

    if (!token) {
      return next.handle(req);
    }

    return next.handle(
      req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }

  private resolveAuthToken(url: string): string | null {
    const checkoutToken = this.checkoutState.getCheckoutToken()?.trim();
    const userToken = this.authService.getToken()?.trim().replace(/^Bearer\s+/i, '') ?? null;
    const apiBase = environment.apiUrl.replace(/\/$/, '');

    const usesCheckoutToken =
      !!checkoutToken &&
      (url.startsWith(`${apiBase}/mercadopago/`) ||
        /\/orders\/\d+\/claim-session$/.test(url));

    if (usesCheckoutToken) {
      return checkoutToken;
    }

    return userToken;
  }
}
