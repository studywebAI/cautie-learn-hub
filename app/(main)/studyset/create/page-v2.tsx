'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

type FlowType = 'linear' | 'workbench' | 'conditional' | 'preset' | 'assessment';

const FLOWS: { id: FlowType; name: string; emoji: string; desc: string }[] = [
  {
    id: 'linear',
    name: 'Lineaire Wizard',
    emoji: '⬇️',
    desc: 'Stap voor stap: naam → upload → instellingen → review → klaar. Klassiek en recht-toe-recht-aan.',
  },
  {
    id: 'workbench',
    name: 'Werkbank (Sidebar)',
    emoji: '📐',
    desc: 'Vaste navigatie links, canvas rechts. Klik onderdelen in willekeurige volgorde, real-time feedback.',
  },
  {
    id: 'conditional',
    name: 'Vragenflow',
    emoji: '❓',
    desc: 'Beantwoord vragen, je antwoorden bepalen het pad. AI past instellingen automatisch aan.',
  },
  {
    id: 'preset',
    name: 'Preset + Sliders',
    emoji: '🎚️',
    desc: 'Kies een voorbouwde set, versteel alles handmatig met live sliders. Full controle.',
  },
  {
    id: 'assessment',
    name: 'AI Assessment',
    emoji: '🧠',
    desc: 'Snelle 5-vraag test, AI bepaalt je niveau en bouwt alles automatisch. Zero config.',
  },
];

export default function CreateFlowSelector() {
  const router = useRouter();
  const [selected, setSelected] = useState<FlowType | null>(null);

  const handleSelect = (flowId: FlowType) => {
    // Route naar specifieke flow
    router.push(`/studyset/create/${flowId}`);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-6 py-8">
        <h1 className="text-3xl font-bold tracking-tight">Nieuwe Studyset Aanmaken</h1>
        <p className="mt-2 max-w-2xl text-[#71717a]">
          Kies je voorkeur: elke flow is fundamenteel anders en geoptimaliseerd voor een ander type student.
          Dezelfde krachtige features in elke flow, alleen de layout verschilt.
        </p>
      </div>

      {/* FLOW SELECTOR GRID */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FLOWS.map((flow) => (
            <button
              key={flow.id}
              onClick={() => handleSelect(flow.id)}
              className="group rounded-xl border-2 border-[#e4e4e7] bg-white p-6 text-left transition hover:border-[#6b7c4e] hover:shadow-lg"
            >
              {/* EMOJI + TITLE */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-4xl">{flow.emoji}</div>
                  <h2 className="mt-3 text-xl font-bold text-[#18181b] group-hover:text-[#6b7c4e]">
                    {flow.name}
                  </h2>
                </div>
                <ChevronRight className="h-6 w-6 text-[#e4e4e7] transition group-hover:text-[#6b7c4e]" />
              </div>

              {/* DESCRIPTION */}
              <p className="mt-3 text-sm text-[#71717a]">{flow.desc}</p>

              {/* FEATURES PREVIEW */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['Upload', 'Output', 'Grounding', 'Analytics', 'Export'].map((f) => (
                  <span key={f} className="rounded-full bg-[#f5f5f5] px-2 py-1 text-xs font-medium text-[#71717a]">
                    {f}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* INFO BOX */}
        <div className="mt-12 rounded-lg bg-[#fef3c7] p-6 text-sm text-[#b45309]">
          <p className="font-semibold">💡 Alle flows hebben dezelfde features:</p>
          <p className="mt-2">
            Upload (3 opties) · Grounding · Output-controle · Bewerken · SRS · Organisatie · Export · Delen ·
            Analytics · Accessibility · Account
          </p>
          <p className="mt-2">Je kiest alleen welke **layout** je liever hebt.</p>
        </div>
      </div>
    </div>
  );
}
