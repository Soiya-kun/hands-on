import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.ITable;
  allowedOrigins: string[];
}

export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const postFn = new lambda.Function(this, 'PostFormFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`const {DynamoDBClient,PutItemCommand}=require('@aws-sdk/client-dynamodb');\nconst crypto=require('crypto');\nconst client=new DynamoDBClient({});\nexports.handler=async(event)=>{const body=JSON.parse(event.body||'{}');const id=body.id||crypto.randomUUID();await client.send(new PutItemCommand({TableName:process.env.TABLE_NAME,Item:{id:{S:id},data:{S:JSON.stringify(body)}}}));return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({id})};};`),
      environment: { TABLE_NAME: props.table.tableName },
    });

    const getFn = new lambda.Function(this, 'GetFormFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`const {DynamoDBClient,GetItemCommand}=require('@aws-sdk/client-dynamodb');\nconst client=new DynamoDBClient({});\nexports.handler=async(event)=>{const id=event.pathParameters?.id;const res=await client.send(new GetItemCommand({TableName:process.env.TABLE_NAME,Key:{id:{S:id}}}));return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(res.Item?JSON.parse(res.Item.data.S):null)};};`),
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
