"use client";

import { useContext } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { BookUser, User, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { NotificationCenter } from './notifications/notification-center';

export function AppHeader() {
  const { role, setRole, session } = useContext(AppContext) as AppContextType;
  const { dictionary } = useDictionary();
  const isStudent = role === 'student';
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(Boolean);

  const userEmail = session?.user?.email;
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  const handleLogout = async () => {
    const response = await fetch('/auth/logout', { method: 'POST' });
    if (response.ok) {
        window.location.href = '/login';
    }
  }

  const getPageTitle = () => {
    if (pathSegments.length === 0) return dictionary.dashboard.title || 'Dashboard';
    
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Don't show UUIDs for class pages
    if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 2] === 'class') {
      return dictionary.classes.title || 'Class Details';
    }
    
    // Map segments to i18n keys
    const segmentMap: Record<string, string> = {
      'subjects': dictionary.subjects.title,
      'classes': dictionary.classes.title,
      'agenda': dictionary.agenda.title,
      'material': dictionary.material.title,
      'settings': dictionary.settings.title,
      'tools': dictionary.tools.title,
      'quiz': dictionary.tools.quiz.title,
      'flashcards': dictionary.tools.flashcards.title,
      'notes': dictionary.tools.notes.title,
      'blocks': dictionary.tools.blocks.title,
      'wordweb': dictionary.tools.wordweb.title,
    };
    
    return segmentMap[lastSegment] || lastSegment?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Cautie';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-card/80 backdrop-blur-sm px-4 md:px-6">

      <div className="flex-1">
        <h1 className="text-xl font-headline">
          {getPageTitle()}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {session ? (
            <>
                <div className="flex items-center justify-between p-2 rounded-full">
                    <Label htmlFor="role-switcher" className="flex items-center gap-2 cursor-pointer pr-3">
                      <User className={`h-5 w-5 transition-colors ${isStudent ? 'text-primary' : 'text-muted-foreground'}`} />
                    </Label>
                    <Switch
                        id="role-switcher"
                        checked={!isStudent}
                        onCheckedChange={(checked) => {
                          console.log('Header: Role switch triggered', { checked, newRole: checked ? 'teacher' : 'student', currentRole: role });
                          setRole(checked ? 'teacher' : 'student');
                        }}
                        aria-label="Toggle between student and teacher view"
                    />
                    <Label htmlFor="role-switcher" className="flex items-center gap-2 cursor-pointer pl-3">
                      <BookUser className={`h-5 w-5 transition-colors ${!isStudent ? 'text-primary' : 'text-muted-foreground'}`} />
                    </Label>
                </div>

                <NotificationCenter />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback>{userInitial}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className='font-normal'>
                            <div className='flex flex-col space-y-1'>
                                <p className='text-sm leading-none'>{dictionary.header.myAccount}</p>
                                <p className='text-xs leading-none text-muted-foreground'>{userEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{dictionary.header.logOut}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </>
        ) : (
             <Button asChild className="rounded-full">
                <Link href="/login">{dictionary.header.logIn}</Link>
            </Button>
        )}

      </div>
    </header>
  );
}
