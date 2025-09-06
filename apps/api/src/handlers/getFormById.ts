import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'id required' };
  }

  const res = await client.send(
    new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: { S: id } },
    }),
  );

  if (!res.Item) {
    return { statusCode: 404, body: 'not found' };
  }

  const data: Record<string, string> = {
    id: res.Item.id.S!,
    name: res.Item.name.S!,
    email: res.Item.email.S!,
    createdAt: res.Item.createdAt.S!,
  };
  if (res.Item.message?.S) data.message = res.Item.message.S;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
