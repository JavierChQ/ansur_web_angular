export const AUTH_ERROR_CODES = {
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  PASSWORD_NOT_SET: 'PASSWORD_NOT_SET',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export interface EmailStatusResponse {
  exists: boolean;
  requires_login: boolean;
  password_not_set?: boolean;
}
