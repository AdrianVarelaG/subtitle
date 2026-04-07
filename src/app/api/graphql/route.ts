import { ApolloServer } from '@apollo/server';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { NextRequest, NextResponse } from 'next/server';

let server: ApolloServer | null = null;

async function getServer(): Promise<ApolloServer> {
  if (!server) {
    server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
  }
  return server;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apollo = await getServer();
  const body = await req.json();

  const result = await apollo.executeOperation({
    query: body.query,
    variables: body.variables,
    operationName: body.operationName,
  });

  if (result.body.kind !== 'single') {
    return NextResponse.json(
      { errors: [{ message: 'Incremental delivery not supported' }] },
      { status: 400 }
    );
  }

  return NextResponse.json(result.body.singleResult);
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: 'GraphQL endpoint — use POST' });
}
