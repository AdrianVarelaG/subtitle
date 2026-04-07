export const typeDefs = `#graphql
  type Subtitle {
    id: ID!
    index: Int!
    startTime: String!
    endTime: String!
    text: String!
  }

  input SubtitleInput {
    id: ID!
    index: Int!
    startTime: String!
    endTime: String!
    text: String!
  }

  type Query {
    ping: String!
  }

  type Mutation {
    parseSRT(content: String!): [Subtitle!]!
    exportSRT(subtitles: [SubtitleInput!]!): String!
  }
`;
