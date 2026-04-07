'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { Subtitle } from '@/lib/srt';
import { SubtitleEntry } from './SubtitleEntry';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseSRT, { loading: parsing }] = useMutation<{
    parseSRT: Subtitle[];
  }>(PARSE_SRT);

  const [exportSRT, { loading: exporting }] = useMutation<{
    exportSRT: string;
  }>(EXPORT_SRT);

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

  const filtered = search
    ? subtitles.filter(
        (s) =>
          s.text.toLowerCase().includes(search.toLowerCase()) ||
          s.startTime.includes(search) ||
          s.endTime.includes(search)
      )
    : subtitles;

  if (!subtitles.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-950/30'
            : 'border-gray-600 bg-gray-900'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <svg className="mb-4 h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="mb-2 text-lg font-medium text-gray-300">
          {parsing ? 'Parsing file…' : 'Drop an SRT file here'}
        </p>
        <p className="mb-6 text-sm text-gray-500">or click to browse</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Open SRT file
        </button>
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

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium text-gray-200">{fileName}</span>
          <span className="text-gray-500">·</span>
          <span>{subtitles.length} entries</span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subtitles…"
          className="flex-1 min-w-40 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
          >
            Open new
          </button>
          <button
            onClick={handleAdd}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
          >
            + Add entry
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Download SRT'}
          </button>
        </div>
      </div>

      {/* Subtitle list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No results for &quot;{search}&quot;</p>
        ) : (
          filtered.map((sub) => (
            <SubtitleEntry
              key={sub.id}
              subtitle={sub}
              onChange={handleChange}
              onDelete={handleDelete}
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
