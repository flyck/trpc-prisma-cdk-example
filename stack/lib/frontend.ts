import { Construct } from 'constructs';
import { StackProps, Stack } from 'aws-cdk-lib';
import { getStringFromStageContext } from './utils';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Certificate, DnsValidatedCertificate, ValidationMethod } from 'aws-cdk-lib/aws-certificatemanager';
import { AllowedMethods, CachePolicy, Distribution, DistributionProps, OriginAccessIdentity, PriceClass, ViewerProtocolPolicy, Function, FunctionCode, FunctionEventType, OriginRequestPolicy, OriginRequestHeaderBehavior, OriginRequestCookieBehavior } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin, HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import * as path from 'path';

interface MoreStackProps extends StackProps {
  projectName: string,
  domain: string,
  url: string,
  apiUrl: string,
}

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: MoreStackProps) {
    super(scope, id, props);

    const projectName = props.projectName
    const stage = scope.node.tryGetContext('stage');
    // Import the hosted zone
    const hostedZone = HostedZone.fromLookup(this, 'hostedZone',
      {
        domainName: props.domain,
      },
    );

    // Review Apps
    let viewerRequestFunction: any
    if (stage != "prod") {
      viewerRequestFunction = new Function(this, 'ViewerRequest', {
        code: FunctionCode.fromFile({
          filePath: path.join(__dirname, "viewerRequest.js")
        }),
      })
    }

    // Certificate
    // this construct is marked as deprecated, but its replacement is lacking features
    // https://github.com/aws/aws-cdk/issues/9274#issuecomment-1468016764
    const cert = new DnsValidatedCertificate(this, 'certificate', {
      domainName: props.url,
      region: 'us-east-1',
      hostedZone
    });

    // S3 Bucket
    const bucket = new Bucket(this, 'WebsiteBucket', {
      bucketName: `${projectName}-${stage}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,

    });

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `CloudFront OriginAccessIdentity for ${bucket.bucketName}`,
    });
    bucket.grantRead(originAccessIdentity);


    // Cloudfront distribution
    const conditionalS3CachePolicy = stage == "prod" ? CachePolicy.CACHING_OPTIMIZED : CachePolicy.CACHING_DISABLED;

    const trpcApiOrigin = new HttpOrigin(props.apiUrl)

    const originRequestPolicy = new OriginRequestPolicy(this, "origin-request", {
      originRequestPolicyName: `${projectName}-forwarding`,
      headerBehavior: OriginRequestHeaderBehavior.allowList(
        "CloudFront-Forwarded-Proto",
        "Origin",
        "Content-Type"
      ),
      cookieBehavior: OriginRequestCookieBehavior.all(),
      queryStringBehavior: OriginRequestCookieBehavior.all()
    })

    const distributionConfig: DistributionProps = {
      defaultBehavior: {
        origin: new S3Origin(
          bucket,
          {
            originPath: "/",
            originAccessIdentity: originAccessIdentity,
          },
        ),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: conditionalS3CachePolicy,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // only deploy subDir fix for review apps in lower envs, not for prod
        functionAssociations: stage != "prod" ? [{
          function: viewerRequestFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        }] : undefined
      },
      additionalBehaviors: {
        "/api/*": {
          origin: trpcApiOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: originRequestPolicy
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html"
        }
      ],
      domainNames: [props.url],
      comment: projectName,
      defaultRootObject: "index.html",
      certificate: cert,
      priceClass: PriceClass.PRICE_CLASS_100
    };

    const distribution = new Distribution(this, 'Distribution', distributionConfig);

    // Route53 dns record
    new ARecord(this, `WebsiteAliasRecord`, {
      zone: hostedZone,
      recordName: props.url,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new StringParameter(this, 'NewFrontendUrlParameter', {
      parameterName: `/Vat-Payments-App/Frontend-Url`,
      stringValue: props.url,
    });
  }
}
