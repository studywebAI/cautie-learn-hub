'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export default function CreatePage() {
  const router = useRouter();

  const flows = [
    { id: 'linear', name: 'Lineaire Wizard', emoji: '⬇️', desc: 'Stap voor stap door alle instellingen' },
    { id: 'workbench', name: 'Werkbank', emoji: '📐', desc: 'Zelf bepalen in welke volgorde je vult' },
    { id: 'conditional', name: 'Vragenflow', emoji: '❓', desc: 'AI bepaalt je instellingen o.b.v. antwoorden' },
    { id: 'preset', name: 'Preset + Sliders', emoji: '🎚️', desc: 'Kies voorbouwde set, dan verstel handmatig' },
    { id: 'assessment', name: 'AI Assessment', emoji: '🧠', desc: 'Snelle test, AI bouwt alles automatisch' },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-8">
        <Link href="/studyset" className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4">
          <ChevronRight className="h-4 w-4 rotate-180" />
          Terug
        </Link>
        <h1 className="text-3xl font-bold">Nieuwe Studyset Aanmaken</h1>
        <p className="mt-2 text-sm text-[#71717a] max-w-2xl">
          Alle flows hebben dezelfde features (upload, grounding, output, SRS, etc.). Kies alleen welke layout je voorkeur is.
        </p>
      </div>

      {/* FLOWS GRID */}
      <div className="mx-auto max-w-4xl px-8 py-12">
        <div className="grid grid-cols-2 gap-4">
          {flows.map((flow) => (
            <button
              key={flow.id}
              onClick={() => router.push(`/studyset/create/${flow.id}`)}
              className="group bg-white border-2 border-[#e4e4e7] rounded-lg p-6 text-left transition hover:border-[#6b7c4e] hover:shadow-md"
            >
              <div className="text-4xl mb-3">{flow.emoji}</div>
              <h2 className="text-lg font-bold text-[#18181b] group-hover:text-[#6b7c4e]">{flow.name}</h2>
              <p className="text-sm text-[#71717a] mt-2">{flow.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-mono text-[#71717a]">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
