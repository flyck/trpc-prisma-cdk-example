import { SecretsManager } from 'aws-sdk';

export const secretId = process.env.DB_SECRET_ARN;

type dbSecret = {
  host: string;
  username: string;
  password: string;
};

const secretsManager = new SecretsManager({
  region: 'eu-central-1',
});
let secret: dbSecret;

export async function fetchSecret() {
  if (process.env.NODE_ENV === 'development') {
    if (!process.env.DATABASE_URL)
      throw 'DB URL cannot be found in development env variables';
    return process.env.DATABASE_URL;
  }
  console.log(`trying to fetch secret ${secretId}`);
  if (!secretId) throw 'Env variable for secret not set';

  if (!secret) {
    console.log('fetching secret...');
    const secretresponse = await secretsManager
      .getSecretValue({ SecretId: secretId })
      .promise();
    if (!secretresponse.SecretString) throw 'empty response';
    secret = JSON.parse(secretresponse.SecretString);
    console.log(`secret fetched: ${secret.host},...`);
  } else {
    console.log('secret already fetched!');
    console.debug(secret.host);
  }

  console.log(`returning secret: ${secret.host},...`);
  return `postgres://${secret.username}:${secret.password}@${secret.host}/main`;
}

export let secretUrl: string;
(async () => {
  secretUrl = await fetchSecret();
})();
