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

// Shared grid — must match the header in SubtitleEditor
export const ROW_GRID = 'grid grid-cols-[2.5rem_9.5rem_9.5rem_3.5rem_1fr_5.5rem]';

// ── Palette ────────────────────────────────────────────────
// Surface:   slate-800  (#1e293b)
// Row bg:    slate-800/50
// Input bg:  slate-900  (#0f172a)
// Border:    slate-600  (#475569) always visible
// Primary:   slate-100  (#f1f5f9)
// Secondary: slate-400  (#94a3b8)
// Muted:     slate-500  (#64748b)
// Time:      emerald-400 (#34d399)
// ───────────────────────────────────────────────────────────

const BADGE: Record<string, string> = {
  'too-many-lines':    'bg-red-800    text-red-100',
  'line-too-long':     'bg-amber-800  text-amber-100',
  'duration-too-short':'bg-orange-800 text-orange-100',
  'duration-too-long': 'bg-orange-800 text-orange-100',
};

const STRIPE: Record<string, string> = {
  review: 'border-l-4 border-l-red-500    bg-red-950/40',
  error:  'border-l-4 border-l-orange-500 bg-orange-950/30',
  warn:   'border-l-4 border-l-amber-500  bg-amber-950/20',
  clean:  'border-l-4 border-l-transparent',
};

const INPUT_BASE =
  'w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 ' +
  'focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30';

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

  const durationMs    = srtTimeToMs(subtitle.endTime) - srtTimeToMs(subtitle.startTime);
  const durationLabel = durationMs >= 0 ? `${(durationMs / 1000).toFixed(1)}s` : '—';
  const durationBad   = durationMs < 1_000 || durationMs > 8_000;

  const stripeClass = needsReview
    ? STRIPE.review
    : hasError
    ? STRIPE.error
    : issues.length > 0
    ? STRIPE.warn
    : STRIPE.clean;

  const applyShift = () => {
    const delta = parseFloat(shiftSec);
    if (!isNaN(delta)) {
      onShiftFrom(subtitle.id, Math.round(delta * 1_000));
      setShiftOpen(false);
    }
  };

  return (
    <div className={`border-b border-slate-700 ${stripeClass}`}>

      {/* ── Main row ── */}
      <div className={`${ROW_GRID} items-start hover:bg-slate-700/20 transition-colors`}>

        {/* # */}
        <div className="px-2 py-2.5 text-right text-xs font-mono text-slate-500 select-none">
          {subtitle.index}
        </div>

        {/* Inicio */}
        <div className="py-2 pr-1">
          <input
            type="text"
            value={subtitle.startTime}
            onChange={(e) => onChange(subtitle.id, 'startTime', e.target.value)}
            className={`${INPUT_BASE} font-mono text-xs text-emerald-400`}
            placeholder="00:00:00,000"
          />
        </div>

        {/* Fin */}
        <div className="py-2 pr-1">
          <input
            type="text"
            value={subtitle.endTime}
            onChange={(e) => onChange(subtitle.id, 'endTime', e.target.value)}
            className={`${INPUT_BASE} font-mono text-xs text-emerald-400`}
            placeholder="00:00:00,000"
          />
        </div>

        {/* Dur */}
        <div className={`py-2.5 text-center text-xs font-mono font-semibold ${durationBad ? 'text-orange-400' : 'text-slate-400'}`}>
          {durationLabel}
        </div>

        {/* Texto + badges */}
        <div className="py-1.5 flex flex-col gap-1.5 min-w-0">
          <textarea
            value={subtitle.text}
            onChange={(e) => onChange(subtitle.id, 'text', e.target.value)}
            rows={Math.max(1, subtitle.text.split('\n').length)}
            className={`${INPUT_BASE} text-sm text-slate-100 leading-snug resize-none`}
          />
          {issues.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center px-0.5">
              {issues.map((issue) => (
                <span
                  key={issue.code}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${BADGE[issue.code] ?? 'bg-slate-700 text-slate-200'}`}
                >
                  {issue.message}
                </span>
              ))}
              {hasReflowFix && onFix && (
                <button
                  onClick={() => onFix(subtitle.id)}
                  className="rounded px-2 py-0.5 text-[11px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  Corregir
                </button>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-start justify-end gap-1 py-2 pr-2">
          {hasReflowFix && onFix && (
            <button
              onClick={() => onFix(subtitle.id)}
              title="Corregir texto"
              className="rounded px-2 py-1 text-xs font-semibold bg-violet-700 hover:bg-violet-600 text-violet-100 transition-colors"
            >
              Fix
            </button>
          )}
          <button
            onClick={() => setShiftOpen((v) => !v)}
            title="Ajustar tiempos desde aqui"
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              shiftOpen
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            ⏱
          </button>
          <button
            onClick={() => onDelete(subtitle.id)}
            title="Eliminar"
            className="rounded px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-red-800 text-slate-300 hover:text-red-100 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Shift control ── */}
      {shiftOpen && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-900 border-t border-slate-700 px-4 py-2.5">
          <span className="text-xs font-medium text-slate-300">Desplazar desde aqui:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={shiftSec}
              onChange={(e) => setShiftSec(e.target.value)}
              className="w-20 rounded bg-slate-800 border border-slate-600 px-2 py-1 text-sm font-mono text-slate-100 focus:border-blue-400 focus:outline-none"
            />
            <span className="text-xs text-slate-400">seg (negativo = retroceder)</span>
          </div>
          <button
            onClick={applyShift}
            className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors"
          >
            Aplicar
          </button>
          <button
            onClick={() => setShiftOpen(false)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
