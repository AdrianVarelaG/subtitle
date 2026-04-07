'use client';

import { useState } from 'react';
import { Subtitle } from '@/lib/srt';
import { SubtitleIssue } from '@/lib/subtitleUtils';

interface SubtitleEntryProps {
  subtitle: Subtitle;
  issues: SubtitleIssue[];
  onChange: (id: string, field: keyof Subtitle, value: string) => void;
  onDelete: (id: string) => void;
  onShiftFrom: (id: string, deltaMs: number) => void;
}

const ISSUE_COLORS: Record<string, string> = {
  'too-many-lines': 'bg-red-900/60 text-red-300 border border-red-700',
  'line-too-long': 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  'duration-too-short': 'bg-orange-900/60 text-orange-300 border border-orange-700',
  'duration-too-long': 'bg-orange-900/60 text-orange-300 border border-orange-700',
};

export function SubtitleEntry({
  subtitle,
  issues,
  onChange,
  onDelete,
  onShiftFrom,
}: SubtitleEntryProps) {
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftSec, setShiftSec] = useState('1.0');

  const needsReview = issues.some((i) => !i.fixable);
  const hasError = issues.some((i) => i.severity === 'error');

  const borderClass = needsReview
    ? 'border-red-600'
    : hasError
    ? 'border-orange-500'
    : issues.length > 0
    ? 'border-yellow-600'
    : 'border-gray-700';

  const applyShift = () => {
    const delta = parseFloat(shiftSec);
    if (!isNaN(delta)) {
      onShiftFrom(subtitle.id, Math.round(delta * 1000));
      setShiftOpen(false);
    }
  };

  return (
    <div
      className={`group flex gap-3 rounded-lg border bg-gray-800 p-3 transition-colors hover:border-gray-500 ${borderClass}`}
    >
      {/* Index + review badge */}
      <div className="flex flex-col items-end gap-1 shrink-0 w-8">
        <span className="mt-1 text-right text-xs font-mono text-gray-500 select-none">
          {subtitle.index}
        </span>
        {needsReview && (
          <span className="rounded px-1 text-[10px] font-bold uppercase tracking-wide bg-red-900 text-red-400">
            rev
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {/* Time row */}
        <div className="flex flex-wrap gap-2 items-center">
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
          <button
            onClick={() => setShiftOpen((v) => !v)}
            className="rounded px-2 py-0.5 text-xs text-gray-400 border border-gray-600 hover:bg-gray-700 hover:text-gray-200"
            title="Ajustar tiempo desde aquí"
          >
            ⏱ Ajustar desde aquí
          </button>
        </div>

        {/* Shift control */}
        {shiftOpen && (
          <div className="flex items-center gap-2 rounded bg-gray-900 border border-gray-600 px-3 py-2">
            <span className="text-xs text-gray-400">Desplazar desde aquí:</span>
            <input
              type="number"
              step="0.1"
              value={shiftSec}
              onChange={(e) => setShiftSec(e.target.value)}
              className="w-20 rounded bg-gray-800 border border-gray-600 px-2 py-1 text-xs text-gray-100 font-mono focus:border-blue-500 focus:outline-none"
              placeholder="1.0"
            />
            <span className="text-xs text-gray-500">seg (negativo para retroceder)</span>
            <button
              onClick={applyShift}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
            >
              Aplicar
            </button>
            <button
              onClick={() => setShiftOpen(false)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-300"
            >
              ×
            </button>
          </div>
        )}

        {/* Text */}
        <textarea
          value={subtitle.text}
          onChange={(e) => onChange(subtitle.id, 'text', e.target.value)}
          rows={Math.max(2, subtitle.text.split('\n').length)}
          className="w-full resize-none rounded bg-gray-900 px-2 py-1 text-sm text-gray-100 border border-gray-700 focus:border-blue-500 focus:outline-none leading-relaxed"
        />

        {/* Issue badges */}
        {issues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {issues.map((issue) => (
              <span
                key={issue.code}
                className={`rounded px-2 py-0.5 text-xs ${ISSUE_COLORS[issue.code] ?? 'bg-gray-700 text-gray-300'}`}
              >
                {issue.message}
                {issue.fixable && (
                  <span className="ml-1 opacity-70">(auto-corregible)</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(subtitle.id)}
        className="mt-1 h-6 w-6 shrink-0 rounded text-gray-600 opacity-0 transition-opacity hover:bg-red-900 hover:text-red-400 group-hover:opacity-100 flex items-center justify-center text-lg leading-none"
        title="Eliminar"
      >
        ×
      </button>
    </div>
  );
}
