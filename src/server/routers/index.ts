// src/server/router/index.ts
import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda';

import { appRouter } from './_app';

// adapted example from: https://trpc.io/docs/v9/aws-lambda
export const handler = awsLambdaRequestHandler({
  router: appRouter,
});
