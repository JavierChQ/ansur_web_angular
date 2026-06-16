import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { EmailStatusResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(user: any) {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(credentials: any) {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  getEmailStatus(email: string) {
    return this.http.get<EmailStatusResponse>(`${this.apiUrl}/auth/email-status`, {
      params: { email },
    });
  }

  setPassword(payload: { token: string; password: string }) {
    return this.http.post(`${this.apiUrl}/auth/set-password`, payload);
  }

  resendSetPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/resend-set-password`, {
      email,
    });
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, {
      email,
    });
  }

  resetPassword(payload: { token: string; password: string }) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, payload);
  }
}
