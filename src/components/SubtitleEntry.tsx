'use client';

import { Subtitle } from '@/lib/srt';

interface SubtitleEntryProps {
  subtitle: Subtitle;
  onChange: (id: string, field: keyof Subtitle, value: string) => void;
  onDelete: (id: string) => void;
}

export function SubtitleEntry({ subtitle, onChange, onDelete }: SubtitleEntryProps) {
  return (
    <div className="group flex gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3 transition-colors hover:border-gray-500">
      <span className="mt-1 w-8 shrink-0 text-right text-xs font-mono text-gray-500 select-none">
        {subtitle.index}
      </span>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={subtitle.startTime}
            onChange={(e) => onChange(subtitle.id, 'startTime', e.target.value)}
            className="w-36 rounded bg-gray-900 px-2 py-1 font-mono text-xs text-green-400 border border-gray-700 focus:border-green-500 focus:outline-none"
            placeholder="00:00:00,000"
          />
          <span className="text-gray-500 text-xs">→</span>
          <input
            type="text"
            value={subtitle.endTime}
            onChange={(e) => onChange(subtitle.id, 'endTime', e.target.value)}
            className="w-36 rounded bg-gray-900 px-2 py-1 font-mono text-xs text-green-400 border border-gray-700 focus:border-green-500 focus:outline-none"
            placeholder="00:00:00,000"
          />
        </div>

        <textarea
          value={subtitle.text}
          onChange={(e) => onChange(subtitle.id, 'text', e.target.value)}
          rows={Math.max(2, subtitle.text.split('\n').length)}
          className="w-full resize-none rounded bg-gray-900 px-2 py-1 text-sm text-gray-100 border border-gray-700 focus:border-blue-500 focus:outline-none leading-relaxed"
        />
      </div>

      <button
        onClick={() => onDelete(subtitle.id)}
        className="mt-1 h-6 w-6 shrink-0 rounded text-gray-600 opacity-0 transition-opacity hover:bg-red-900 hover:text-red-400 group-hover:opacity-100 flex items-center justify-center text-lg leading-none"
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}
