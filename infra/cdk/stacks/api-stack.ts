import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { join } from 'path';

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.ITable;
  allowedOrigins: string[];
}

export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const postFn = new NodejsFunction(this, 'PostFormFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: join(__dirname, '../../../apps/api/src/handlers/postForms.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: props.table.tableName },
    });

    const getFn = new NodejsFunction(this, 'GetFormFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: join(__dirname, '../../../apps/api/src/handlers/getFormById.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: props.table.tableName },
    });

    const healthFn = new lambda.Function(this, 'HealthFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler=async()=>({statusCode:200,body:"ok"});'),
    });

    props.table.grantWriteData(postFn);
    props.table.grantReadData(getFn);

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST],
        allowOrigins: props.allowedOrigins,
      },
    });

    this.httpApi.addRoutes({
      path: '/forms',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('PostIntegration', postFn),
    });

    this.httpApi.addRoutes({
      path: '/forms/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetIntegration', getFn),
    });

    this.httpApi.addRoutes({
      path: '/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('HealthIntegration', healthFn),
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.apiEndpoint,
    });
  }
}
