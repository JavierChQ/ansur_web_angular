import { dotenvEnvironment } from './environment.generated';

export const environment = {
  production: true,
  apiUrl: dotenvEnvironment.apiUrlProd
};
