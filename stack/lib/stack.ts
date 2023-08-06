import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';

interface ProjectStackProps extends StackProps {
  projectName: string
}

export class StackStack extends Stack {
  private props: ProjectStackProps

  constructor(scope: Construct, id: string, props: ProjectStackProps) {
    super(scope, id, props);

    this.props = props
  }

  async setup(): Promise<void> {
    const projectName = this.props.projectName

    let trpcLambda
    try {
      trpcLambda = new NodejsFunction(this, 'trpcApiFunction', {
        runtime: Runtime.NODEJS_16_X,
        functionName: projectName + "-trpc-api",
        handler: 'handler',
        entry: path.join(__dirname, '../../src/server/routers/_app.ts'),
        depsLockFilePath: path.join(__dirname, '../../pnpm.lock'),
        projectRoot: path.join(__dirname, '../../'),
        timeout: Duration.seconds(20),
        tracing: Tracing.ACTIVE,
        memorySize: 1024,
        environment: {
          NODE_ENV: "development",
          LOG_LEVEL: "DEBUG",
        },
        bundling: {
          //nodeModules: ['@prisma/client', 'prisma'],
          commandHooks: {
            beforeBundling(inputDir: string, outputDir: string): string[] {
              return []
            },
            beforeInstall(inputDir: string, outputDir: string) {
              return []
            },
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [
                `cd ${outputDir}`,
                `cp -R ${inputDir}/node_modules/prisma/libquery_engine-rhel-openssl-1.0.x.so.node ${outputDir}/`,
                `npx prisma generate --schema=${inputDir}/prisma/schema.prisma`,  // --schema=${outputDir}/schema.prisma
                `cp -R ${inputDir}/prisma/ .`,
                `rm -rf node_modules/@prisma/engines`,
              ]
            },
          },
        },
      })
    } catch (err) {
      console.error("Exiting. Couldnt build trpc lambda function: " + err)
      // https://github.com/aws/aws-cdk/issues/17944
      // https://github.com/aws/aws-cdk/issues/8273
      process.exit(1);
    }
  }
}
