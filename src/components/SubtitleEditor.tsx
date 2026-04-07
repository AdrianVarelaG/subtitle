'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { Subtitle } from '@/lib/srt';
import { validateSubtitle, fixSubtitle, reflowSubtitle, shiftFrom } from '@/lib/subtitleUtils';
import { SubtitleEntry, ROW_GRID } from './SubtitleEntry';

const PARSE_SRT = gql`
  mutation ParseSRT($content: String!) {
    parseSRT(content: $content) {
      id
      index
      startTime
      endTime
      text
    }
  }
`;

const EXPORT_SRT = gql`
  mutation ExportSRT($subtitles: [SubtitleInput!]!) {
    exportSRT(subtitles: $subtitles)
  }
`;

export function SubtitleEditor() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [search, setSearch] = useState('');
  type IssueFilter = 'all' | 'any' | 'review' | 'duration';
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseSRT, { loading: parsing }] = useMutation<{
    parseSRT: Subtitle[];
  }>(PARSE_SRT);

  const [exportSRT, { loading: exporting }] = useMutation<{
    exportSRT: string;
  }>(EXPORT_SRT);

  // Compute issues for every subtitle
  const issuesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateSubtitle>>();
    for (const sub of subtitles) {
      map.set(sub.id, validateSubtitle(sub));
    }
    return map;
  }, [subtitles]);

  const needsReviewCount = useMemo(
    () =>
      [...issuesMap.values()].filter((issues) =>
        issues.some((i) => !i.fixable)
      ).length,
    [issuesMap]
  );

  const durationFixableCount = useMemo(
    () =>
      [...issuesMap.values()].filter((issues) =>
        issues.some(
          (i) =>
            (i.code === 'duration-too-short' || i.code === 'duration-too-long') &&
            i.fixable
        )
      ).length,
    [issuesMap]
  );

  const reflowCount = useMemo(
    () =>
      [...issuesMap.values()].filter((issues) =>
        issues.some((i) => i.code === 'too-many-lines' && i.fixable)
      ).length,
    [issuesMap]
  );

  const loadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.srt')) {
        alert('Please upload a valid .srt file.');
        return;
      }
      const content = await file.text();
      setFileName(file.name);
      const result = await parseSRT({ variables: { content } });
      if (result.data) setSubtitles(result.data.parseSRT);
    },
    [parseSRT]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleChange = useCallback(
    (id: string, field: keyof Subtitle, value: string) => {
      setSubtitles((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    setSubtitles((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, index: i + 1 }))
    );
  }, []);

  const handleAdd = () => {
    const last = subtitles[subtitles.length - 1];
    const newSub: Subtitle = {
      id: `sub-new-${Date.now()}`,
      index: subtitles.length + 1,
      startTime: last?.endTime ?? '00:00:00,000',
      endTime: last?.endTime ?? '00:00:01,000',
      text: '',
    };
    setSubtitles((prev) => [...prev, newSub]);
  };

  const handleFixAll = () => {
    setSubtitles((prev) => prev.map(fixSubtitle));
  };

  const handleFixAllReflow = () => {
    setSubtitles((prev) => prev.map((sub) => reflowSubtitle(sub) ?? sub));
  };

  const handleFix = useCallback((id: string) => {
    setSubtitles((prev) =>
      prev.map((sub) => (sub.id !== id ? sub : reflowSubtitle(sub) ?? sub))
    );
  }, []);

  const handleShiftFrom = useCallback(
    (id: string, deltaMs: number) => {
      setSubtitles((prev) => shiftFrom(prev, id, deltaMs));
    },
    []
  );

  const handleExport = async () => {
    const result = await exportSRT({
      variables: {
        subtitles: subtitles.map(({ id, index, startTime, endTime, text }) => ({
          id,
          index,
          startTime,
          endTime,
          text,
        })),
      },
    });
    if (!result.data) return;
    const blob = new Blob([result.data.exportSRT], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let list = subtitles;
    if (issueFilter === 'any') {
      list = list.filter((s) => (issuesMap.get(s.id)?.length ?? 0) > 0);
    } else if (issueFilter === 'review') {
      list = list.filter((s) => issuesMap.get(s.id)?.some((i) => !i.fixable));
    } else if (issueFilter === 'duration') {
      list = list.filter((s) =>
        issuesMap.get(s.id)?.some(
          (i) => i.code === 'duration-too-short' || i.code === 'duration-too-long'
        )
      );
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.text.toLowerCase().includes(search.toLowerCase()) ||
          s.startTime.includes(search) ||
          s.endTime.includes(search)
      );
    }
    return list;
  }, [subtitles, search, issueFilter, issuesMap]);

  if (!subtitles.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-950/40'
            : 'border-slate-600 bg-slate-900'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <svg className="mb-4 h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="mb-2 text-lg font-semibold text-slate-200">
          {parsing ? 'Procesando archivo…' : 'Arrastra un archivo SRT aqui'}
        </p>
        <p className="mb-6 text-sm text-slate-400">o haz clic para buscar</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          Abrir archivo SRT
        </button>
        <input ref={fileInputRef} type="file" accept=".srt" className="hidden" onChange={handleFileInput} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-600 px-3 py-1.5">
          <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-semibold text-slate-100">{fileName}</span>
          <span className="text-slate-600">·</span>
          <span className="text-sm text-slate-400">{subtitles.length} entradas</span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar subtitulos..."
          className="flex-1 min-w-40 rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
        />

        <div className="ml-auto flex gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Abrir nuevo
          </button>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            + Agregar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-blue-600 border border-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Exportando…' : 'Descargar SRT'}
          </button>
        </div>
      </div>

      {/* ── Quality bar ── */}
      {(needsReviewCount > 0 || durationFixableCount > 0 || reflowCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-800 border border-slate-600 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-300 mr-1">Calidad:</span>

          {needsReviewCount > 0 && (
            <button
              onClick={() => setIssueFilter('review')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 bg-red-900 border border-red-700 text-red-200 text-xs font-medium hover:bg-red-800 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
              {needsReviewCount} necesitan revision
            </button>
          )}

          {reflowCount > 0 && (
            <button
              onClick={() => setIssueFilter('any')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 bg-violet-900 border border-violet-700 text-violet-200 text-xs font-medium hover:bg-violet-800 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
              {reflowCount} auto-corregibles
            </button>
          )}

          {durationFixableCount > 0 && (
            <button
              onClick={() => setIssueFilter('duration')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 bg-orange-900 border border-orange-700 text-orange-200 text-xs font-medium hover:bg-orange-800 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
              {durationFixableCount} duracion fuera de rango
            </button>
          )}

          <div className="h-4 w-px bg-slate-600 mx-1" />

          {reflowCount > 0 && (
            <button
              onClick={handleFixAllReflow}
              className="rounded-md px-3 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Corregir texto en todos
            </button>
          )}

          {durationFixableCount > 0 && (
            <button
              onClick={handleFixAll}
              className="rounded-md px-3 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors"
            >
              Corregir duracion en todos
            </button>
          )}

          {/* Filter selector */}
          <div className="ml-auto flex rounded-lg border border-slate-600 overflow-hidden text-xs font-medium">
            {(
              [
                { value: 'all',      label: 'Todos' },
                { value: 'any',      label: 'Con problemas' },
                { value: 'review',   label: 'Para revisar' },
                { value: 'duration', label: 'Duracion' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setIssueFilter(value)}
                className={`px-3 py-1.5 transition-colors ${
                  issueFilter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Subtitle table ── */}
      <div className="rounded-lg border border-slate-700 overflow-hidden bg-slate-900">
        {/* Header */}
        <div className={`${ROW_GRID} border-b border-slate-700 bg-slate-800`}>
          <div className="px-2 py-2 text-right text-[11px] font-semibold text-slate-400 select-none">#</div>
          <div className="py-2 px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inicio</div>
          <div className="py-2 px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fin</div>
          <div className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dur.</div>
          <div className="py-2 px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Texto</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm font-medium text-slate-500">
            {search ? `Sin resultados para "${search}"` : 'No hay subtitulos con problemas'}
          </p>
        ) : (
          filtered.map((sub) => (
            <SubtitleEntry
              key={sub.id}
              subtitle={sub}
              issues={issuesMap.get(sub.id) ?? []}
              onChange={handleChange}
              onDelete={handleDelete}
              onShiftFrom={handleShiftFrom}
              onFix={handleFix}
            />
          ))
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".srt"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
