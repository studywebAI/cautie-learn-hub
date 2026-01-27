'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Link as LinkIcon } from 'lucide-react';
import type { ClassInfo } from '@/contexts/app-context';

type InviteDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classInfo: any;
};

export function InviteDialog({ isOpen, setIsOpen, classInfo }: InviteDialogProps) {
  const { toast } = useToast();

  const inviteLink = classInfo.join_code ? `${window.location.origin}/classes?join_code=${classInfo.join_code}` : '';
  const qrCodeUrl = classInfo.join_code ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}&format=png` : '';

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied to Clipboard!",
        description: `The class join ${type} has been copied.`,
    });
  }

  const resetAndClose = () => {
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        resetAndClose();
    } else {
        setIsOpen(true);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Invite Students to "{classInfo.name}"</DialogTitle>
          <DialogDescription>
            Share this QR code, link, or code with your students to have them join your class.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 items-center py-4">
            <div className="flex flex-col items-center gap-4">
                {qrCodeUrl && (
                    <div className="p-4 bg-white rounded-lg border">
                        <img src={qrCodeUrl} alt="Class Invite QR Code" width={200} height={200} className="rounded" />
                    </div>
                )}
            </div>
            <div className='w-full space-y-4'>
                <div className='space-y-2'>
                    <Label>Join Code</Label>
                    <div className="flex w-full items-center space-x-2">
                       <Input type="text" value={classInfo.join_code} readOnly />
                       <Button type="submit" size="icon" onClick={() => copyToClipboard(classInfo.join_code || '', 'code')}>
                         <Copy className="h-4 w-4" />
                       </Button>
                    </div>
                </div>
                 {inviteLink && <div className='space-y-2'>
                    <Label>Invite Link</Label>
                    <div className="flex w-full items-center space-x-2">
                       <Input type="text" value={inviteLink} readOnly />
                       <Button type="submit" size="icon" onClick={() => copyToClipboard(inviteLink, 'link')}>
                         <LinkIcon className="h-4 w-4" />
                       </Button>
                    </div>
                </div>}
            </div>
        </div>
        <DialogFooter>
            <Button onClick={resetAndClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}