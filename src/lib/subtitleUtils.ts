import { Subtitle } from './srt';

export type IssueCode =
  | 'too-many-lines'
  | 'line-too-long'
  | 'duration-too-short'
  | 'duration-too-long';

export type IssueSeverity = 'error' | 'warning';

export interface SubtitleIssue {
  code: IssueCode;
  message: string;
  severity: IssueSeverity;
  fixable: boolean;
}

export function srtTimeToMs(time: string): number {
  const match = time.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);
  return h * 3_600_000 + m * 60_000 + s * 1_000 + ms;
}

export function msToSrtTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  const rem = total % 1_000;
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    ',' +
    String(rem).padStart(3, '0')
  );
}

export function validateSubtitle(sub: Subtitle): SubtitleIssue[] {
  const issues: SubtitleIssue[] = [];
  const lines = sub.text.split('\n');

  if (lines.length > 2) {
    issues.push({
      code: 'too-many-lines',
      message: `${lines.length} líneas (máx 2)`,
      severity: 'error',
      fixable: false,
    });
  }

  const maxLen = Math.max(...lines.map((l) => l.length));
  if (maxLen > 40) {
    issues.push({
      code: 'line-too-long',
      message: `${maxLen} caracteres (ideal ≤40)`,
      severity: 'warning',
      fixable: false,
    });
  }

  const startMs = srtTimeToMs(sub.startTime);
  const endMs = srtTimeToMs(sub.endTime);
  const duration = endMs - startMs;

  if (duration < 1_000) {
    issues.push({
      code: 'duration-too-short',
      message: `${(duration / 1000).toFixed(2)}s (mín 1s)`,
      severity: 'error',
      fixable: true,
    });
  } else if (duration > 8_000) {
    issues.push({
      code: 'duration-too-long',
      message: `${(duration / 1000).toFixed(1)}s (máx 8s)`,
      severity: 'error',
      fixable: true,
    });
  }

  return issues;
}

export function fixSubtitle(sub: Subtitle): Subtitle {
  const startMs = srtTimeToMs(sub.startTime);
  const endMs = srtTimeToMs(sub.endTime);
  const duration = endMs - startMs;

  if (duration >= 1_000 && duration <= 8_000) return sub;

  const newDuration = Math.min(8_000, Math.max(1_000, duration));
  return { ...sub, endTime: msToSrtTime(startMs + newDuration) };
}

export function shiftFrom(
  subtitles: Subtitle[],
  fromId: string,
  deltaMs: number
): Subtitle[] {
  const fromIdx = subtitles.findIndex((s) => s.id === fromId);
  if (fromIdx === -1) return subtitles;
  return subtitles.map((sub, i) => {
    if (i < fromIdx) return sub;
    return {
      ...sub,
      startTime: msToSrtTime(srtTimeToMs(sub.startTime) + deltaMs),
      endTime: msToSrtTime(srtTimeToMs(sub.endTime) + deltaMs),
    };
  });
}
