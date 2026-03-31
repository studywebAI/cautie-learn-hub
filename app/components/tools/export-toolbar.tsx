'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Printer, Check, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ExportToolbarProps = {
  /** Tool type for labeling */
  toolType: 'quiz' | 'flashcards' | 'notes';
  /** Function that returns markdown string of the content */
  getMarkdown: () => string;
  /** Function that returns HTML string for print/PDF */
  getHtml: () => string;
  /** Optional title for the export */
  title?: string;
};

export function ExportToolbar({ toolType, getMarkdown, getHtml, title }: ExportToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const fileName = title || `${toolType}-${new Date().toISOString().slice(0, 10)}`;

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(getMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard', description: 'Markdown content copied.' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not access clipboard.' });
    }
  };

  const handlePrint = () => {
    const html = getHtml();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ variant: 'destructive', title: 'Popup blocked', description: 'Allow popups to use print.' });
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${fileName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page {
      size: A4;
      margin: 2cm 2.5cm;
    }
    
    body {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }
    
    .doc-header {
      text-align: center;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16pt;
      margin-bottom: 24pt;
    }
    
    .doc-header h1 {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6pt;
    }
    
    .doc-header .meta {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    
    h2 {
      font-size: 14pt;
      font-weight: 600;
      margin: 20pt 0 8pt;
      padding-bottom: 4pt;
      border-bottom: 1px solid #e5e5e5;
    }
    
    h3 {
      font-size: 12pt;
      font-weight: 600;
      margin: 14pt 0 6pt;
    }
    
    p { margin: 6pt 0; }
    
    ul, ol {
      margin: 6pt 0;
      padding-left: 20pt;
    }
    
    li { margin: 3pt 0; }
    
    .question-block {
      page-break-inside: avoid;
      padding: 12pt 16pt;
      margin: 10pt 0;
      border: 1px solid #e5e5e5;
      border-radius: 4pt;
    }
    
    .question-block .q-number {
      font-weight: 700;
      font-size: 10pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4pt;
    }
    
    .question-block .q-text {
      font-weight: 500;
      margin-bottom: 8pt;
    }
    
    .question-block .option {
      padding: 3pt 0 3pt 20pt;
      position: relative;
    }
    
    .question-block .option::before {
      content: attr(data-letter);
      position: absolute;
      left: 0;
      font-weight: 600;
      color: #999;
    }
    
    .flashcard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10pt;
    }
    
    .flashcard-item {
      page-break-inside: avoid;
      border: 1px solid #d4d4d4;
      border-radius: 4pt;
      padding: 10pt 12pt;
    }
    
    .flashcard-item .term {
      font-weight: 600;
      font-size: 10pt;
      margin-bottom: 4pt;
    }
    
    .flashcard-item .definition {
      font-size: 9.5pt;
      color: #444;
    }
    
    .answer-key {
      margin-top: 24pt;
      padding-top: 12pt;
      border-top: 2px solid #1a1a1a;
    }
    
    .answer-key h2 {
      font-size: 12pt;
      border-bottom: none;
    }
    
    .answer-key .answer-row {
      display: inline-block;
      width: 80pt;
      font-size: 9pt;
      padding: 2pt 0;
    }
    
    .note-section {
      page-break-inside: avoid;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${html}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Use print-to-PDF approach via a hidden iframe
      const html = getHtml();
      const blob = new Blob([`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${fileName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; padding: 40pt; }
    h1 { font-size: 20pt; font-weight: 700; margin-bottom: 8pt; }
    h2 { font-size: 14pt; font-weight: 600; margin: 16pt 0 8pt; border-bottom: 1px solid #eee; padding-bottom: 4pt; }
    h3 { font-size: 12pt; font-weight: 600; margin: 12pt 0 6pt; }
    p { margin: 6pt 0; }
    ul, ol { padding-left: 20pt; margin: 6pt 0; }
    li { margin: 3pt 0; }
    .question-block { padding: 12pt; margin: 8pt 0; border: 1px solid #e5e5e5; border-radius: 4pt; }
    .question-block .q-number { font-weight: 700; font-size: 10pt; color: #666; margin-bottom: 4pt; }
    .question-block .q-text { font-weight: 500; margin-bottom: 8pt; }
    .question-block .option { padding: 2pt 0 2pt 20pt; position: relative; }
    .question-block .option::before { content: attr(data-letter); position: absolute; left: 0; font-weight: 600; color: #999; }
    .flashcard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
    .flashcard-item { border: 1px solid #d4d4d4; border-radius: 4pt; padding: 10pt 12pt; }
    .flashcard-item .term { font-weight: 600; font-size: 10pt; margin-bottom: 4pt; }
    .flashcard-item .definition { font-size: 9.5pt; color: #444; }
  </style>
</head>
<body>${html}</body>
</html>`], { type: 'text/html' });

      // Download as HTML file (universally opens in browser for print-to-PDF)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: 'Open the file and use Print → Save as PDF for a perfect PDF.' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" onClick={handleCopyMarkdown} className="gap-1.5 text-xs rounded-full h-7">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button variant="ghost" size="sm" onClick={handlePrint} className="gap-1.5 text-xs rounded-full h-7">
        <Printer className="h-3 w-3" />
        Print
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="gap-1.5 text-xs rounded-full h-7">
        {isGeneratingPdf ? <Download className="h-3 w-3 animate-pulse" /> : <FileText className="h-3 w-3" />}
        Download
      </Button>
    </div>
  );
}
