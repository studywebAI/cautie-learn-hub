'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Copy, FileSignature, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useDictionary } from '@/contexts/app-context';

export default function ToolsPage() {
  const { dictionary } = useDictionary();
  const tools = [
    {
      title: dictionary.sidebar.tools.quizGenerator,
      description: dictionary.tools.quiz.description,
      icon: BrainCircuit,
      href: '/tools/quiz',
    },
    {
      title: dictionary.sidebar.tools.flashcardMaker,
      description: dictionary.tools.flashcards.description,
      icon: Copy,
      href: '/tools/flashcards',
    },
      {
      title: dictionary.sidebar.tools.materialProcessor,
      description: dictionary.tools.material.description,
      icon: FileSignature,
      href: '/material',
    }
  ];

  return (
    <div className="h-full bg-background">
      <div className="flex flex-col gap-8 h-full">
        <header>
          <h1 className="text-3xl font-headline">{dictionary.tools.title}</h1>
          <p className="text-muted-foreground">
            {dictionary.tools.description}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
          {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                   <Card key={tool.title} className="flex flex-col group hover:border-primary focus-within:border-primary active:border-primary transition-all">
                      <CardHeader>
                          <div className="flex items-start justify-between">
                               <CardTitle className="font-headline text-xl">{tool.title}</CardTitle>
                               <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                                  <Icon className="h-6 w-6" />
                               </div>
                          </div>
                          <CardDescription>{tool.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow"></CardContent>
                      <CardFooter>
                          <Button asChild className="w-full">
                              <Link href={tool.href}>
                                  {dictionary.tools.select}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                          </Button>
                      </CardFooter>
                  </Card>
              )
          })}
        </div>
      </div>
    </div>
  );
}
