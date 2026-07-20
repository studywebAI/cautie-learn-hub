'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, TableBlockContent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StudentTableBlockProps {
  block: BaseBlock & { data: TableBlockContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentTableBlock: React.FC<StudentTableBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const columns = block.data.columns || [];
  const rows = block.data.rows || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const editableCellIds = rows.flatMap((row: any) =>
    row.cells.map((cell: any, ci: number) => (cell.editable ? `${row.id}:${ci}` : null)).filter((id: any) => id) as string[]
  );
  const allFilled = editableCellIds.length > 0 && editableCellIds.every((id: string) => (values[id] || '').trim());

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit({
      values,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    });
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {columns.map((col: any) => (
                <th key={col.id} className="border border-border p-2 text-left font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id}>
                {row.cells.map((cell: any, ci: number) => {
                  const cellId = `${row.id}:${ci}`;
                  return (
                    <td key={ci} className="border border-border p-2">
                      {cell.editable ? (
                        <Input
                          value={values[cellId] || ''}
                          onChange={(e) => setValues((prev) => ({ ...prev, [cellId]: e.target.value }))}
                          disabled={isSubmitted || isSubmitting}
                          className="h-8"
                        />
                      ) : (
                        <span>{cell.value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={!allFilled || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600 font-medium">Answer submitted successfully!</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
