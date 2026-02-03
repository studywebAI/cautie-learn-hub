"use client";

import { useContext } from 'react';
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { BookUser, User } from 'lucide-react';
import { Button } from './ui/button';

export function TopBar() {
  const { role, setRole, session } = useContext(AppContext) as AppContextType;
  const { dictionary } = useDictionary();
  const isStudent = role === 'student';

  return (
    <div className="absolute top-2 right-2 z-30 flex items-center gap-3">
      {session ? (
        <div className="flex items-center justify-between p-1.5 rounded-full bg-card/80 backdrop-blur-sm">
          <Label htmlFor="role-switcher" className="flex items-center gap-1 cursor-pointer pr-2">
            <User className={`h-4 w-4 transition-colors ${isStudent ? 'text-primary' : 'text-muted-foreground'}`} />
          </Label>
          <Switch
            id="role-switcher"
            checked={!isStudent}
            onCheckedChange={(checked) => setRole(checked ? 'teacher' : 'student')}
            aria-label="Toggle between student and teacher view"
          />
          <Label htmlFor="role-switcher" className="flex items-center gap-1 cursor-pointer pl-2">
            <BookUser className={`h-4 w-4 transition-colors ${!isStudent ? 'text-primary' : 'text-muted-foreground'}`} />
          </Label>
        </div>
      ) : (
        <Button asChild size="sm" className="rounded-full">
          <Link href="/login">{dictionary.header.logIn}</Link>
        </Button>
      )}
    </div>
  );
}
