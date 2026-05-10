'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type ClassOption = {
  id: string;
  name: string;
};

type SendToClassButtonProps = {
  classes: ClassOption[];
  classIdFromRoute?: string | null;
  sending?: boolean;
  onSend: (classId: string) => Promise<void> | void;
  label?: string;
  className?: string;
};

export function SendToClassButton({
  classes,
  classIdFromRoute,
  sending = false,
  onSend,
  label = 'Send to class',
  className,
}: SendToClassButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  const safeClasses = useMemo(
    () =>
      classes
        .filter((item) => item && item.id)
        .map((item) => ({ id: String(item.id), name: String(item.name || 'Untitled class') })),
    [classes]
  );

  if (safeClasses.length === 0) return null;

  const handleClick = () => {
    const routeClassId = String(classIdFromRoute || '').trim();
    if (routeClassId) {
      void onSend(routeClassId);
      return;
    }
    if (safeClasses.length === 1) {
      void onSend(safeClasses[0].id);
      return;
    }
    setSelectedClassId((prev) => prev || safeClasses[0].id);
    setPickerOpen(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" className={className} onClick={handleClick} disabled={sending}>
        <span className="text-xs">{sending ? 'Sending...' : label}</span>
      </Button>
      {pickerOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-md rounded-xl border border-sidebar-border bg-background p-4 shadow-xl">
            <p className="mb-2 text-sm font-medium">Select class</p>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="mb-3 h-9 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 text-sm"
            >
              {safeClasses.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}>Cancel</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedClassId) return;
                  setPickerOpen(false);
                  void onSend(selectedClassId);
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

