import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateAddressPayload {
  address: string;
  district: string;
  id_user: number;
}

export interface Address {
  id: number;
  address: string;
  district: string;
  id_user: number;
}

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private readonly addressUrl = `${environment.apiUrl}/address`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateAddressPayload): Observable<Address> {
    return this.http.post<Address>(this.addressUrl, payload);
  }
}
