import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DniIdentityResponse, RucIdentityResponse } from '../models/identity.model';

@Injectable({
  providedIn: 'root',
})
export class IdentityService {
  private readonly baseUrl = `${environment.apiUrl}/identity`;

  constructor(private readonly http: HttpClient) {}

  lookupDni(docNumber: string): Observable<DniIdentityResponse> {
    return this.http.get<DniIdentityResponse>(`${this.baseUrl}/dni/${docNumber}`);
  }

  lookupRuc(docNumber: string): Observable<RucIdentityResponse> {
    return this.http.get<RucIdentityResponse>(`${this.baseUrl}/ruc/${docNumber}`);
  }
}
