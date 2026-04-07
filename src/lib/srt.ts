export interface Subtitle {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export function parseSRT(content: string): Subtitle[] {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split(/\n\s*\n/);

  return blocks
    .map((block, i) => {
      const lines = block.trim().split('\n');
      if (lines.length < 2) return null;

      const index = parseInt(lines[0].trim(), 10);
      if (isNaN(index)) return null;

      const timeLine = lines[1];
      const timeMatch = timeLine.match(
        /(\d{2}:\d{2}:\d{2}[,:.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,:.]\d{3})/
      );
      if (!timeMatch) return null;

      const startTime = timeMatch[1].replace('.', ',');
      const endTime = timeMatch[2].replace('.', ',');
      const text = lines.slice(2).join('\n').trim();

      return { id: `sub-${i}-${Date.now()}`, index, startTime, endTime, text };
    })
    .filter((s): s is Subtitle => s !== null);
}

export function exportSRT(subtitles: Subtitle[]): string {
  return subtitles
    .map((s, i) => `${i + 1}\n${s.startTime} --> ${s.endTime}\n${s.text}`)
    .join('\n\n');
}
