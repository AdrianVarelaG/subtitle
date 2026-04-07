import { parseSRT, exportSRT, Subtitle } from '@/lib/srt';

export const resolvers = {
  Query: {
    ping: () => 'pong',
  },
  Mutation: {
    parseSRT: (_: unknown, { content }: { content: string }): Subtitle[] => {
      return parseSRT(content);
    },
    exportSRT: (
      _: unknown,
      { subtitles }: { subtitles: Subtitle[] }
    ): string => {
      return exportSRT(subtitles);
    },
  },
};
