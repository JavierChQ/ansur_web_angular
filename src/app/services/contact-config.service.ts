import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactConfig {
  whatsapp: string;
  whatsappDisplay: string;
  whatsappUrl: string;
  address: string;
  website: string;
  facebookUrl: string | null;
  tiktokUrl: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ContactConfigService {
  private readonly configUrl = `${environment.apiUrl}/config/contact`;
  private readonly configSubject = new BehaviorSubject<ContactConfig | null>(null);
  private readonly loadErrorSubject = new BehaviorSubject<boolean>(false);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private loadStarted = false;

  readonly config$ = this.configSubject.asObservable();
  readonly loadError$ = this.loadErrorSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  load(): void {
    if (this.loadStarted) {
      return;
    }

    this.loadStarted = true;
    this.loadingSubject.next(true);

    this.http.get<ContactConfig>(this.configUrl).subscribe({
      next: (config) => {
        this.configSubject.next(config);
        this.loadErrorSubject.next(false);
        this.loadingSubject.next(false);
      },
      error: () => {
        this.configSubject.next(null);
        this.loadErrorSubject.next(true);
        this.loadingSubject.next(false);
      },
    });
  }

  get snapshot(): ContactConfig | null {
    return this.configSubject.value;
  }

  get hasLoadError(): boolean {
    return this.loadErrorSubject.value;
  }

  get isLoading(): boolean {
    return this.loadingSubject.value;
  }

  getConfig(): Observable<ContactConfig | null> {
    return this.config$;
  }
}
