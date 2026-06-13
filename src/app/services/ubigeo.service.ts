import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

export interface UbigeoDistrict {
  distrito: string;
  ubigeo: string;
}

export interface UbigeoProvince {
  provincia: string;
  distritos: UbigeoDistrict[];
}

export interface UbigeoDepartment {
  departamento: string;
  provincias: UbigeoProvince[];
}

@Injectable({
  providedIn: 'root',
})
export class UbigeoService {
  private data$?: Observable<UbigeoDepartment[]>;

  constructor(private readonly http: HttpClient) {}

  getDepartments(): Observable<UbigeoDepartment[]> {
    if (!this.data$) {
      this.data$ = this.http
        .get<UbigeoDepartment[]>('assets/data/ubigeo-peru.json')
        .pipe(shareReplay(1));
    }
    return this.data$;
  }

  getProvinces(departamento: string): Observable<UbigeoProvince[]> {
    return this.getDepartments().pipe(
      map((departments) => {
        const found = departments.find((item) => item.departamento === departamento);
        return found?.provincias ?? [];
      }),
    );
  }

  getDistricts(departamento: string, provincia: string): Observable<UbigeoDistrict[]> {
    return this.getProvinces(departamento).pipe(
      map((provinces) => {
        const found = provinces.find((item) => item.provincia === provincia);
        return found?.distritos ?? [];
      }),
    );
  }
}
