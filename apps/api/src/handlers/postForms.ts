import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ulid } from 'ulid';
import { z } from 'zod';

const client = new DynamoDBClient({});

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().max(2000).optional(),
  consent: z.literal(true),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  let payload: unknown;
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: 'invalid json' };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.error.format()),
    };
  }

  const id = ulid();
  const createdAt = new Date().toISOString();

  await client.send(
    new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        id: { S: id },
        name: { S: result.data.name },
        email: { S: result.data.email },
        createdAt: { S: createdAt },
        ...(result.data.message ? { message: { S: result.data.message } } : {}),
      },
    }),
  );

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, saved_at: createdAt }),
  };
};
