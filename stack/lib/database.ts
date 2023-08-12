import { Construct } from 'constructs';
import { StackProps, Stack } from 'aws-cdk-lib';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, Port, Protocol, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';


interface MoreStackProps extends StackProps {
  projectName: string,
}
export class DatabaseStack extends Stack {
  public readonly secret: Secret;

  constructor(scope: Construct, id: string, props: MoreStackProps) {
    super(scope, id, props);

    const projectName = props.projectName

    const vpc = Vpc.fromLookup(this, 'Vpc', {
      isDefault: true
    });

    const creds = new DatabaseSecret(this, 'MysqlRdsCredentials', {
      secretName: `/${projectName}/rds`,
      username: 'postgres',
      dbname: 'main',
    })

    const db = new DatabaseInstance(this, 'MysqlRdsInstance', {
      vpcSubnets: {
        onePerAz: true,
        subnetType: SubnetType.PUBLIC
      },
      credentials: Credentials.fromSecret(creds),
      vpc,
      databaseName: 'main',
      allocatedStorage: 20,
      instanceIdentifier: `${projectName}`,
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_15_3
      }),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO)
    })

    db.connections.allowFromAnyIpv4(
      new Port(
        { fromPort: 5432, toPort: 5432, protocol: Protocol.ALL, stringRepresentation: "postgres" }
      ),
      "public access"
    )

    this.secret = creds
  }
}
