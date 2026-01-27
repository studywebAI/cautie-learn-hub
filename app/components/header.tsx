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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-card/80 backdrop-blur-sm px-4 md:px-6">

      <div className="flex-1">
        <h1 className="text-xl font-semibold font-headline">
          {(() => {
            if (pathSegments.length === 0) return 'Dashboard';

            const lastSegment = pathSegments[pathSegments.length - 1];

            // Don't show UUIDs for class pages
            if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 2] === 'class') {
              return 'Class Details';
            }

            // Format other segments nicely
            return lastSegment?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Cautie';
          })()}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {session ? (
            <>
                <div className="flex items-center justify-between p-2 rounded-md">
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
                                <p className='text-sm font-medium leading-none'>My Account</p>
                                <p className='text-xs leading-none text-muted-foreground'>{userEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </>
        ) : (
             <Button asChild>
                <Link href="/login">Log In</Link>
            </Button>
        )}

      </div>
    </header>
  );
}
