
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  BookOpen,
  Home,
  Settings,
  Folder,
  BrainCircuit,
  Copy,
  FileSignature,
  ChevronDown,
  Wrench,
  School,
  Calendar,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/contexts/app-context';

export function AppSidebar() {
  const pathname = usePathname();
  const { dictionary } = useDictionary();
  const isToolsPath = pathname.startsWith('/tools') || pathname === '/material';

  const menuItems = [
    { href: '/', label: dictionary.sidebar.dashboard, icon: Home },
    { href: '/subjects', label: dictionary.sidebar.subjects, icon: BookOpen },
    { href: '/classes', label: dictionary.sidebar.classes, icon: School },
    { href: '/agenda', label: dictionary.sidebar.agenda, icon: Calendar },
    { href: '/material', label: dictionary.sidebar.tools.materialProcessor, icon: FileSignature },
  ];

  const toolsMenuItems = [
    { href: '/tools/quiz', label: dictionary.sidebar.tools.quizGenerator, icon: BrainCircuit },
    { href: '/tools/flashcards', label: dictionary.sidebar.tools.flashcardMaker, icon: Copy },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-primary">
            StudyWeb
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4 flex-1">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                className="font-medium"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <Collapsible defaultOpen={pathname.startsWith('/tools')}>
             <CollapsibleTrigger asChild>
                <div className={cn(
                  "flex items-center w-full justify-start gap-2 p-2 font-medium text-sm h-auto rounded-md transition-colors",
                  pathname.startsWith('/tools') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}>
                    <Folder className="h-5 w-5" />
                    <span>{dictionary.sidebar.tools.title}</span>
                    <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", pathname.startsWith('/tools') && 'rotate-180')} />
                </div>
             </CollapsibleTrigger>
             <CollapsibleContent>
                <div className="pl-7 pt-2 flex flex-col gap-1">
                    {toolsMenuItems.map((item) => (
                         <SidebarMenuButton
                            key={item.label}
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.label}
                            className="font-medium h-9"
                        >
                            <Link href={item.href}>
                                <item.icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    ))}
                </div>
             </CollapsibleContent>
          </Collapsible>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 flex flex-col gap-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={dictionary.sidebar.settings}
              className="font-medium"
              isActive={pathname === '/settings'}
            >
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span>{dictionary.sidebar.settings}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
