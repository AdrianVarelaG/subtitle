import { SubtitleEditor } from "@/components/SubtitleEditor";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          SRT Subtitle Editor
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Open an SRT file, edit timestamps and text, then download.
        </p>
      </header>
      <SubtitleEditor />
    </main>
  );
}
