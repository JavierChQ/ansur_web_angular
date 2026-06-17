export interface DniIdentityResponse {
  doc_type: 'DNI';
  doc_number: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  validated_at: string;
  provider: 'apisperu';
}

export interface RucIdentityResponse {
  doc_type: 'RUC';
  doc_number: string;
  razon_social: string;
  direccion: string;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  estado: string;
  condicion: string;
  validated_at: string;
  provider: 'apisperu';
}

export interface IdentityErrorBody {
  code?: string;
  message?: string;
}

export const IDENTITY_ERROR_CODES = {
  INVALID_DNI_FORMAT: 'IDENTITY_INVALID_DNI_FORMAT',
  INVALID_RUC_FORMAT: 'IDENTITY_INVALID_RUC_FORMAT',
  DNI_NOT_FOUND: 'IDENTITY_DNI_NOT_FOUND',
  RUC_NOT_FOUND: 'IDENTITY_RUC_NOT_FOUND',
  RUC_NOT_ACTIVE: 'IDENTITY_RUC_NOT_ACTIVE',
  SERVICE_UNAVAILABLE: 'IDENTITY_SERVICE_UNAVAILABLE',
  PROVIDER_NOT_CONFIGURED: 'IDENTITY_PROVIDER_NOT_CONFIGURED',
  INVOICE_DATA_MISMATCH: 'INVOICE_DATA_MISMATCH',
} as const;
