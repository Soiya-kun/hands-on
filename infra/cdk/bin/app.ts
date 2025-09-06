#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../stacks/frontend-stack';
import { DatabaseStack } from '../stacks/database-stack';
import { ApiStack } from '../stacks/api-stack';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') ?? 'stg';
const prefix = process.env.STACK_PREFIX ?? 'HandsOn';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.AWS_REGION };

const frontend = new FrontendStack(app, `${prefix}-${stage}-FrontendStack`, { env });
const database = new DatabaseStack(app, `${prefix}-${stage}-DatabaseStack`, { env });

new ApiStack(app, `${prefix}-${stage}-ApiStack`, {
  env,
  table: database.table,
  allowedOrigins: [frontend.distributionDomainName ? `https://${frontend.distributionDomainName}` : '*'],
});
