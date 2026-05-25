'use client';

import { useState, useRef, useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

type BulkImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: Record<string, number | null>) => void;
  studentNames: string[];
};

interface ParsedGradeRow {
  studentName: string;
  grade: number | null;
  weight?: number | null;
  error?: string;
}

export default function BulkImportDialog({
  isOpen,
  onOpenChange,
  onImport,
  studentNames,
}: BulkImportDialogProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';

  const [csvContent, setCsvContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedGradeRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    const rows: ParsedGradeRow[] = [];

    lines.forEach((line, idx) => {
      if (!line.trim()) return; // Skip empty lines

      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) {
        rows.push({
          studentName: '',
          grade: null,
          error: isDutch ? 'Ongeldig formaat' : 'Invalid format',
        });
        return;
      }

      const studentName = parts[0];
      const gradeStr = parts[1];
      const weightStr = parts[2];

      const grade = gradeStr ? parseFloat(gradeStr) : null;
      const weight = weightStr ? parseFloat(weightStr) : null;

      const validationError = (() => {
        if (!studentName) {
          return isDutch ? 'Studentennaam ontbreekt' : 'Student name missing';
        }
        if (!studentNames.some(n => n.toLowerCase().includes(studentName.toLowerCase()))) {
          return isDutch ? 'Student niet gevonden' : 'Student not found';
        }
        if (grade === null || isNaN(grade)) {
          return isDutch ? 'Ongeldig cijfer' : 'Invalid grade';
        }
        if (grade < 0 || grade > 10) {
          return isDutch ? 'Cijfer moet tussen 0 en 10 zijn' : 'Grade must be between 0 and 10';
        }
        return undefined;
      })();

      rows.push({
        studentName,
        grade,
        weight,
        error: validationError,
      });
    });

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setParsedData(parseCSV(content));
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const content = e.clipboardData.getData('text');
    setCsvContent(content);
    setParsedData(parseCSV(content));
  };

  const handleImport = async () => {
    const errors = parsedData.filter(row => row.error);
    if (errors.length > 0) {
      return;
    }

    setImporting(true);
    try {
      // Convert parsed data to grade records
      const gradeMap: Record<string, number | null> = {};
      parsedData.forEach(row => {
        // Find matching student by name (case-insensitive)
        const student = studentNames.find(n =>
          n.toLowerCase().includes(row.studentName.toLowerCase())
        );
        if (student && row.grade !== null) {
          gradeMap[student] = row.grade;
        }
      });

      onImport(gradeMap);
      onOpenChange(false);
      setCsvContent('');
      setParsedData([]);
    } catch (err) {
      console.error('Error importing grades:', err);
    } finally {
      setImporting(false);
    }
  };

  const validRows = parsedData.filter(row => !row.error).length;
  const totalRows = parsedData.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isDutch ? 'Bulk Importeren' : 'Bulk Import'}</DialogTitle>
          <DialogDescription>
            {isDutch
              ? 'Importeer cijfers uit CSV. Formaat: StudentName,Grade,Weight (optioneel)'
              : 'Import grades from CSV. Format: StudentName,Grade,Weight (optional)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">
              {isDutch ? 'CSV-bestand' : 'CSV File'}
            </label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isDutch ? 'Bestand uploaden' : 'Upload File'}
              </Button>
            </div>
          </div>

          {/* Text area for paste */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">
              {isDutch ? 'Of plak CSV-inhoud' : 'Or paste CSV content'}
            </label>
            <textarea
              value={csvContent}
              onChange={e => {
                setCsvContent(e.currentTarget.value);
                setParsedData(parseCSV(e.currentTarget.value));
              }}
              onPaste={handlePaste}
              placeholder={`StudentName,Grade,Weight\nAlex Johnson,8.5,1\nBella Smith,7.2,1`}
              className="w-full h-24 p-3 border border-border rounded-lg text-sm font-mono resize-none"
            />
          </div>

          {/* Preview table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold">
                  {isDutch ? 'Voorbeeld' : 'Preview'} ({validRows} / {totalRows})
                </label>
                {validRows > 0 && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="text-left p-2 font-semibold text-muted-foreground">
                        {isDutch ? 'Student' : 'Student'}
                      </th>
                      <th className="text-center p-2 font-semibold text-muted-foreground">
                        {isDutch ? 'Cijfer' : 'Grade'}
                      </th>
                      <th className="text-center p-2 font-semibold text-muted-foreground">
                        {isDutch ? 'Gewicht' : 'Weight'}
                      </th>
                      <th className="text-left p-2 font-semibold text-muted-foreground">
                        {isDutch ? 'Status' : 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.error
                            ? 'bg-red-50 border-b border-border'
                            : 'border-b border-border hover:bg-muted/30'
                        }
                      >
                        <td className="p-2">{row.studentName || '—'}</td>
                        <td className="text-center p-2">
                          {row.grade !== null ? row.grade.toFixed(1) : '—'}
                        </td>
                        <td className="text-center p-2">
                          {row.weight !== null ? row.weight.toFixed(1) : '—'}
                        </td>
                        <td className="p-2">
                          {row.error ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-[10px]">{row.error}</span>
                            </div>
                          ) : (
                            <div className="text-green-600 text-[10px] font-semibold">
                              ✓ {isDutch ? 'Geldig' : 'Valid'}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedData.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  {isDutch
                    ? `En ${parsedData.length - 10} meer...`
                    : `And ${parsedData.length - 10} more...`}
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
            <p className="font-semibold">
              {isDutch ? 'CSV Formaat:' : 'CSV Format:'}
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li>{isDutch ? 'Eerste kolom: studentennaam' : 'First column: student name'}</li>
              <li>{isDutch ? 'Tweede kolom: cijfer (0-10)' : 'Second column: grade (0-10)'}</li>
              <li>
                {isDutch
                  ? 'Derde kolom (optioneel): gewicht'
                  : 'Third column (optional): weight'}
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setCsvContent('');
              setParsedData([]);
            }}
          >
            {isDutch ? 'Annuleren' : 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={validRows === 0 || importing}
          >
            {importing
              ? isDutch
                ? 'Importeren...'
                : 'Importing...'
              : isDutch
                ? 'Importeren'
                : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
