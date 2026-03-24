'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function IntegrationsPage() {
  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
        <Card className="border-none">
          <CardHeader>
            <CardTitle>Integrations disabled</CardTitle>
            <CardDescription>
              Microsoft account linking has been removed from this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link prefetch={false} href="/tools">
                Back to Toolbox
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
