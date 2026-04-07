'use client';

import { useState } from 'react';
import { Subtitle } from '@/lib/srt';
import { SubtitleIssue, srtTimeToMs } from '@/lib/subtitleUtils';

interface SubtitleEntryProps {
  subtitle: Subtitle;
  issues: SubtitleIssue[];
  onChange: (id: string, field: keyof Subtitle, value: string) => void;
  onDelete: (id: string) => void;
  onShiftFrom: (id: string, deltaMs: number) => void;
  onFix?: (id: string) => void;
}

// Shared grid layout — must match the header in SubtitleEditor
export const ROW_GRID = 'grid grid-cols-[2.5rem_9rem_9rem_3.5rem_1fr_5.5rem]';

const BADGE_COLORS: Record<string, string> = {
  'too-many-lines':    'bg-red-900/70 text-red-300',
  'line-too-long':     'bg-yellow-900/70 text-yellow-300',
  'duration-too-short':'bg-orange-900/70 text-orange-300',
  'duration-too-long': 'bg-orange-900/70 text-orange-300',
};

export function SubtitleEntry({
  subtitle,
  issues,
  onChange,
  onDelete,
  onShiftFrom,
  onFix,
}: SubtitleEntryProps) {
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftSec, setShiftSec] = useState('1.0');

  const needsReview  = issues.some((i) => !i.fixable);
  const hasError     = issues.some((i) => i.severity === 'error');
  const hasReflowFix = issues.some((i) => i.code === 'too-many-lines' && i.fixable);

  const durationMs = srtTimeToMs(subtitle.endTime) - srtTimeToMs(subtitle.startTime);
  const durationLabel = durationMs >= 0 ? `${(durationMs / 1000).toFixed(1)}s` : '—';
  const durationBad   = durationMs < 1_000 || durationMs > 8_000;

  // Left stripe + row tint
  const stripeClass = needsReview
    ? 'border-l-2 border-l-red-600 bg-red-950/20'
    : hasError
    ? 'border-l-2 border-l-orange-500 bg-orange-950/10'
    : issues.length > 0
    ? 'border-l-2 border-l-yellow-600 bg-yellow-950/10'
    : 'border-l-2 border-l-transparent';

  const applyShift = () => {
    const delta = parseFloat(shiftSec);
    if (!isNaN(delta)) {
      onShiftFrom(subtitle.id, Math.round(delta * 1_000));
      setShiftOpen(false);
    }
  };

  return (
    <div className={`border-b border-gray-800 ${stripeClass}`}>
      {/* ── Main row ── */}
      <div className={`${ROW_GRID} items-start`}>

        {/* # */}
        <div className="px-2 py-2.5 text-right text-xs font-mono text-gray-500 select-none">
          {subtitle.index}
        </div>

        {/* Inicio */}
        <div className="py-2 pr-1">
          <input
            type="text"
            value={subtitle.startTime}
            onChange={(e) => onChange(subtitle.id, 'startTime', e.target.value)}
            className="w-full rounded bg-transparent px-1 py-0.5 font-mono text-xs text-green-400
                       border border-transparent hover:border-gray-700
                       focus:border-green-500 focus:bg-gray-900 focus:outline-none"
            placeholder="00:00:00,000"
          />
        </div>

        {/* Fin */}
        <div className="py-2 pr-1">
          <input
            type="text"
            value={subtitle.endTime}
            onChange={(e) => onChange(subtitle.id, 'endTime', e.target.value)}
            className="w-full rounded bg-transparent px-1 py-0.5 font-mono text-xs text-green-400
                       border border-transparent hover:border-gray-700
                       focus:border-green-500 focus:bg-gray-900 focus:outline-none"
            placeholder="00:00:00,000"
          />
        </div>

        {/* Dur */}
        <div className={`py-2.5 text-center text-xs font-mono ${durationBad ? 'text-orange-400 font-semibold' : 'text-gray-500'}`}>
          {durationLabel}
        </div>

        {/* Texto + badges */}
        <div className="py-1.5 flex flex-col gap-1 min-w-0">
          <textarea
            value={subtitle.text}
            onChange={(e) => onChange(subtitle.id, 'text', e.target.value)}
            rows={Math.max(1, subtitle.text.split('\n').length)}
            className="w-full resize-none rounded bg-transparent px-1.5 py-1 text-sm text-gray-100 leading-snug
                       border border-transparent hover:border-gray-700
                       focus:border-blue-500 focus:bg-gray-900 focus:outline-none"
          />
          {issues.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center px-1 pb-0.5">
              {issues.map((issue) => (
                <span
                  key={issue.code}
                  className={`rounded px-1.5 py-px text-[10px] ${BADGE_COLORS[issue.code] ?? 'bg-gray-700 text-gray-400'}`}
                >
                  {issue.message}
                </span>
              ))}
              {hasReflowFix && onFix && (
                <button
                  onClick={() => onFix(subtitle.id)}
                  className="rounded px-2 py-px text-[10px] font-medium bg-purple-700 hover:bg-purple-600 text-white transition-colors"
                >
                  Corregir
                </button>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-0.5 py-1.5 pr-2">
          {hasReflowFix && onFix && (
            <button
              onClick={() => onFix(subtitle.id)}
              title="Corregir texto"
              className="rounded px-1.5 py-1 text-xs text-purple-400 hover:bg-purple-900/50 hover:text-purple-300 transition-colors"
            >
              Fix
            </button>
          )}
          <button
            onClick={() => setShiftOpen((v) => !v)}
            title="Ajustar tiempos desde aquí"
            className={`rounded p-1 text-sm transition-colors ${
              shiftOpen ? 'bg-blue-800 text-blue-200' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            ⏱
          </button>
          <button
            onClick={() => onDelete(subtitle.id)}
            title="Eliminar"
            className="rounded p-1 text-gray-600 hover:bg-red-900/60 hover:text-red-400 transition-colors text-base leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Shift control ── */}
      {shiftOpen && (
        <div className="flex items-center gap-2 bg-gray-900/60 border-t border-gray-800 px-4 py-2">
          <span className="text-xs text-gray-400 shrink-0">Desplazar desde aqui:</span>
          <input
            type="number"
            step="0.1"
            value={shiftSec}
            onChange={(e) => setShiftSec(e.target.value)}
            className="w-16 rounded bg-gray-800 border border-gray-600 px-2 py-0.5 text-xs font-mono text-gray-100 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-gray-600">seg</span>
          <button
            onClick={applyShift}
            className="rounded bg-blue-600 px-3 py-0.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            Aplicar
          </button>
          <button
            onClick={() => setShiftOpen(false)}
            className="text-xs text-gray-600 hover:text-gray-400"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
