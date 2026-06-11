import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MercadoPagoConfig {
  public_key: string;
  site_id: string;
  locale: string;
}

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoConfigService {
  private readonly configUrl = `${environment.apiUrl}/mercadopago/config`;

  constructor(private readonly http: HttpClient) {}

  getConfig(): Observable<MercadoPagoConfig> {
    return this.http.get<MercadoPagoConfig>(this.configUrl);
  }
}
