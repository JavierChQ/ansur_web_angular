import { dotenvEnvironment } from './environment.generated';

export const environment = {
  production: false,
  apiUrl: dotenvEnvironment.apiUrl
};
