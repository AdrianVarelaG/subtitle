'use client';

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';
import { ApolloProvider } from '@apollo/client/react';
import { ReactNode, useMemo } from 'react';

export function ApolloWrapper({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new ApolloClient({
        link: new HttpLink({ uri: '/api/graphql' }),
        cache: new InMemoryCache(),
      }),
    []
  );
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
