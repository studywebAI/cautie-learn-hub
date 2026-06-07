'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download, Copy, Check } from 'lucide-react';

const EXPORT_FORMATS = [
  { id: 'anki', name: 'Anki', desc: '.apkg formaat - direct in Anki importeren', icon: '🎴' },
  { id: 'csv', name: 'CSV', desc: 'Spreadsheet formaat - Excel/Google Sheets', icon: '📊' },
  { id: 'pdf', name: 'PDF', desc: 'Printbaar document', icon: '📄' },
  { id: 'markdown', name: 'Markdown', desc: 'Gewone tekstformaat', icon: '📝' },
  { id: 'notion', name: 'Notion', desc: 'Direct in Notion importeren', icon: '📌' },
  { id: 'quizlet', name: 'Quizlet', desc: 'Quizlet import formaat', icon: '🎯' },
];

export default function ExportPage({ params }: { params: { id: string } }) {
  const [selectedFormat, setSelectedFormat] = useState('anki');
  const [exported, setExported] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const handleExport = () => {
    console.log(`Exporting to ${selectedFormat}`);
    setExported(true);
    // TODO: API call to generate export
  };

  const handleGenerateShareLink = () => {
    const link = `cautie.app/share/${params.id}/abc123def456`;
    setShareLink(link);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <Link href={`/studyset/${params.id}`} className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4">
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Link>
        <h1 className="text-3xl font-bold">📤 Exporteren & Delen</h1>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-8 space-y-8">
        {/* EXPORT SECTION */}
        <div>
          <h2 className="text-lg font-bold text-[#18181b] mb-4">Exporteren naar:</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  selectedFormat === fmt.id
                    ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                    : 'border-[#e4e4e7] bg-white hover:border-[#6b7c4e]'
                }`}
              >
                <div className="text-2xl mb-2">{fmt.icon}</div>
                <div className="font-bold text-[#18181b]">{fmt.name}</div>
                <div className="text-xs text-[#71717a] mt-1">{fmt.desc}</div>
              </button>
            ))}
          </div>

          {exported && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 mb-6">
              ✓ Geëxporteerd! Check je downloads.
            </div>
          )}

          <button
            onClick={handleExport}
            className="w-full px-6 py-3 bg-[#6b7c4e] text-white rounded-lg font-bold hover:bg-[#4f5d3a] transition flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporteer naar {selectedFormat.toUpperCase()}
          </button>
        </div>

        {/* SHARING SECTION */}
        <div className="border-t border-[#e4e4e7] pt-8">
          <h2 className="text-lg font-bold text-[#18181b] mb-4">Delen via link</h2>

          {!shareLink ? (
            <button
              onClick={handleGenerateShareLink}
              className="w-full px-6 py-3 border-2 border-[#6b7c4e] text-[#6b7c4e] rounded-lg font-bold hover:bg-[#f5f3f0] transition"
            >
              Genereer deellink
            </button>
          ) : (
            <div className="bg-[#f5f3f0] rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase text-[#71717a] mb-2">Deellink</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm bg-white"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-4 py-2 bg-[#6b7c4e] text-white rounded-lg font-semibold hover:bg-[#4f5d3a] flex items-center gap-2"
                  >
                    {shareLinkCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Gekopieerd
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieëren
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-[#e4e4e7]">
                <p className="text-xs font-bold uppercase text-[#71717a] mb-2">Zichtbaarheid</p>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="visibility" defaultChecked className="rounded-full" />
                    <span>Iedereen met link</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="visibility" className="rounded-full" />
                    <span>Alleen uitgenodigden</span>
                  </label>
                </div>
              </div>

              <div className="text-xs text-[#71717a] p-3 bg-white rounded border border-[#e4e4e7]">
                💡 Mensen die deze link krijgen kunnen de studyset bekijken en forken, maar niet bewerken.
              </div>
            </div>
          )}
        </div>

        {/* CALENDAR SYNC */}
        <div className="border-t border-[#e4e4e7] pt-8">
          <h2 className="text-lg font-bold text-[#18181b] mb-4">📅 Agenda Sync</h2>
          <p className="text-sm text-[#71717a] mb-4">
            Synchroniseer je herhaalmomenten met je agenda zodat je altijd weet wanneer je moet studeren.
          </p>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded cursor-pointer" />
            <span className="text-sm font-medium text-[#18181b]">Sync met agenda</span>
          </label>
        </div>
      </div>
    </div>
  );
}
