# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (also runs TypeScript check)
npm run lint     # ESLint
```

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Apollo Client v4 · Apollo Server

**Data flow:**
1. User uploads `.srt` file in the browser → reads it as a string
2. `parseSRT` GraphQL mutation is sent to `/api/graphql` → server parses text into `Subtitle[]`
3. Client holds the subtitle array in React state (not in Apollo cache)
4. User edits entries inline; changes go directly to local state
5. `exportSRT` GraphQL mutation sends the full `Subtitle[]` back → server serializes to SRT string → client triggers a browser download

**GraphQL endpoint:** `src/app/api/graphql/route.ts` — Apollo Server instantiated as a singleton, executed via `server.executeOperation()` and returned as a plain `NextResponse.json`.

**Apollo Client v4 import split:**
- Core utilities (`ApolloClient`, `InMemoryCache`, `HttpLink`, `gql`) → `@apollo/client/core`
- React hooks/components (`ApolloProvider`, `useMutation`) → `@apollo/client/react`

**Key files:**
- `src/lib/srt.ts` — SRT parser and serializer
- `src/lib/subtitleUtils.ts` — Quality validation, time utilities, reflow and fix helpers
- `src/lib/graphql/schema.ts` — GraphQL type definitions
- `src/lib/graphql/resolvers.ts` — Resolvers (thin wrappers over `srt.ts`)
- `src/components/ApolloWrapper.tsx` — Client-side Apollo provider
- `src/components/SubtitleEditor.tsx` — Main editor (file upload, subtitle list, search, export, quality bar)
- `src/components/SubtitleEntry.tsx` — Single subtitle row with inline editing, issue badges, time shift

## Subtitle quality rules

Enforced in `src/lib/subtitleUtils.ts` via `validateSubtitle()`:

| Rule | Threshold | Severity | Auto-fixable |
|------|-----------|----------|--------------|
| Max lines | > 2 lines | error | Yes, if text fits in 2×40 chars (`reflowSubtitle`) |
| Line length | > 40 chars | warning | No |
| Duration too short | < 1 second | error | Yes (`fixSubtitle` clamps end time) |
| Duration too long | > 8 seconds | error | Yes (`fixSubtitle` clamps end time) |

**Key functions in `subtitleUtils.ts`:**
- `validateSubtitle(sub)` → `SubtitleIssue[]`
- `reflowSubtitle(sub)` → `Subtitle | null` — flattens 3+ lines into 2 balanced lines (≤40 chars each, shorter line first); returns `null` if the text doesn't fit
- `fixSubtitle(sub)` → `Subtitle` — clamps duration to 1–8 s
- `shiftFrom(subtitles, fromId, deltaMs)` → `Subtitle[]` — shifts all subtitles from `fromId` forward by `deltaMs` milliseconds
- `srtTimeToMs(time)` / `msToSrtTime(ms)` — convert between SRT time strings and milliseconds

## Quality bar filters (SubtitleEditor)

The quality bar appears when any issues are detected. Badges are clickable to activate the corresponding filter:

| Filter | Shows |
|--------|-------|
| Todos | All subtitles |
| Con problemas | Any subtitle with at least one issue |
| Para revisar | Subtitles with non-fixable issues (line count, line length) |
| Duración | Subtitles with duration out of range |
