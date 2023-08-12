import { Stack, App, IAspect } from 'aws-cdk-lib';
import { Node, IConstruct } from 'constructs';
import { Role, CfnRole } from 'aws-cdk-lib/aws-iam';

export function getStringFromStageContext(
  ref: Stack | App | Node,
  name: string
) {
  const node: Node = 'node' in ref ? ref.node : ref;

  const stage = node.tryGetContext('stage');
  if (stage === undefined) {
    throw new Error(
      `Could not find Stage in Context - please specify it on the command line: --context stage=stage`
    );
  }
  const configMap = node.tryGetContext(stage);

  if (configMap === undefined) {
    throw new Error(
      `The stage you provided (${stage}) is not provided in cdk context`
    );
  }

  if (configMap[name] === undefined) {
    throw new Error(`${name} not provided in cdk context for stage ${stage}`);
  }
  return configMap[name];
}

export function getStringFromContext(ref: Stack | App | Node, name: string) {
  const node: Node = 'node' in ref ? ref.node : ref;
  const value = node.tryGetContext(name);

  if (value === undefined) {
    throw new Error(`${name} not provided in cdk context`);
  }
  return value;
}

export class PermissionsBoundary implements IAspect {
  private readonly permissionsBoundaryArn: string;

  constructor(permissionBoundaryArn: string) {
    this.permissionsBoundaryArn = permissionBoundaryArn;
  }

  public visit(node: IConstruct): void {
    if (node instanceof Role) {
      const roleResource = node.node.findChild('Resource') as CfnRole;
      roleResource.addPropertyOverride('PermissionsBoundary', this.permissionsBoundaryArn);
    }
  }
}
