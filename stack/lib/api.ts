import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';
import { Architecture, IFunction, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { DomainNameOptions, LambdaIntegration, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { Effect, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

interface ProjectStackProps extends StackProps {
  projectName: string
  apiUrl: string
  secret: Secret
}

export class ApiStack extends Stack {
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
        runtime: Runtime.NODEJS_18_X,
        functionName: projectName + "-api",
        handler: 'handler',
        role: this.getRole(this.props.secret.secretFullArn!),
        entry: path.join(__dirname, '../../src/server/routers/index.ts'),
        depsLockFilePath: path.join(__dirname, '../../pnpm-lock.yaml'),
        projectRoot: path.join(__dirname, '../../'),
        timeout: Duration.seconds(20),
        tracing: Tracing.ACTIVE,
        memorySize: 1024,
        architecture: Architecture.X86_64,
        environment: {
          LOG_LEVEL: "DEBUG",
          DB_SECRET_ARN: this.props.secret.secretFullArn!
        },
        bundling: {
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
                `npx prisma generate --schema=${inputDir}/prisma/schema.prisma`,
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

    this.createApiGatewayForLambda("api", trpcLambda)
  }

  createApiGatewayForLambda(id: string, handler: IFunction): LambdaRestApi {
    const apiDomain = this.props.apiUrl
    const rootDomain = "long-thoughts.com"

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: rootDomain
    });

    const acmCertificate = new Certificate(this, 'certificate', {
      domainName: apiDomain,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const api = new LambdaRestApi(this, id, {
      restApiName: this.props.projectName + "-api",
      handler,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['*']
      },
      domainName: {
        domainName: apiDomain,
        certificate: acmCertificate,
      }
    });

    const trpcResource = api.root.addResource("api")
    const trpcApiResource = trpcResource.addResource("trpc")
    trpcApiResource.addProxy({
      anyMethod: true,
      defaultIntegration: new LambdaIntegration(handler),
    })

    new ARecord(this, `WebsiteAliasRecord`, {
      zone: hostedZone,
      recordName: apiDomain,
      target: RecordTarget.fromAlias(new ApiGateway(api)),
    });

    return api
  }

  private getRole(secretArn: string) {
    const apiRole = new Role(this, 'BookingApiRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: this.props.projectName + "-api",
    });
    apiRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'));
    apiRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'));
    apiRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'));

    const inlinePolicyStatements: Array<PolicyStatement> = [
      new PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        effect: Effect.ALLOW,
        resources: [secretArn],
      })
    ];

    apiRole.attachInlinePolicy(
      new Policy(this, 'policy', {
        statements: inlinePolicyStatements,
      }));


    return apiRole
  }

}
