#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api';
import { FrontendStack } from '../lib/frontend';
import { getStringFromStageContext } from '../lib/utils';
import { DatabaseStack } from '../lib/database';

const projectName = "trpc-prisma-cdk"

const app = new cdk.App();
const env = {
  account: getStringFromStageContext(app, "account"),
  region: getStringFromStageContext(app, "region"),
};

const dbStack = new DatabaseStack(app, 'Database', {
  env,
  projectName,
});

const apiStack = new ApiStack(app, 'Backend', {
  env,
  projectName,
  apiUrl: "api.trpc.long-thoughts.com",
  secret: dbStack.secret
});

apiStack.setup()

new FrontendStack(app, 'Frontend', {
  env,
  projectName,
  domain: getStringFromStageContext(app, "domain"),
  url: getStringFromStageContext(app, "url"),
  apiUrl: getStringFromStageContext(app, "apiUrl"),
});
