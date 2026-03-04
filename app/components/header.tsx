"use client";

import { useContext } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { LogOut, Settings, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { NotificationCenter } from './notifications/notification-center';

export function AppHeader() {
  const { session } = useContext(AppContext) as AppContextType;
  const { dictionary } = useDictionary();
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
    if (pathSegments.length === 0) return dictionary.dashboard?.title || 'Dashboard';
    
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Don't show UUIDs for class pages
    if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 2] === 'class') {
      return (dictionary as any).classes?.title || dictionary.sidebar.classes || 'Class Details';
    }
    
    // Map segments to i18n keys (use fallback for any missing keys)
    const segmentMap: Record<string, string> = {
      'subjects': 'Subjects',
      'classes': 'Classes',
      'agenda': 'Agenda',
      'material': 'Material',
      'settings': 'Settings',
      'tools': 'Tools',
      'quiz': 'Quiz',
      'flashcards': 'Flashcards',
      'notes': 'Notes',
      'blocks': 'Blocks',
      'wordweb': 'WordWeb',
    };
    
    return segmentMap[lastSegment] || lastSegment?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Cautie';
  };

  return (
    <header className="Sticky top-0 z-30 flex h-16 items-center gap-4 bg-card/80 backdrop-blur-sm px-4 md:px-6">

      <div className="flex-1">
        <h1 className="text-xl font-headline">
          {getPageTitle()}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {session ? (
            <>
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
                        <DropdownMenuItem asChild>
                            <Link href="/settings" className="flex items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="https://cautie-learn-hub.vercel.app/help" target="_blank" rel="noopener noreferrer" className="flex items-center">
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>Help & FAQ</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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
