'use client';

import { Suspense } from 'react';
import PrimaryFlow from '../primary-flow';
import LinearWizard from '../linear-wizard';
import WorkbenchFlow from '../workbench';
import ConditionalFlow from '../conditional';
import PresetFlow from '../preset';
import AssessmentFlow from '../assessment';
import Link from 'next/link';

export default function CreateFlowPage({ params }: { params: { flow: string } }) {
  const flowMap: Record<string, React.ReactNode> = {
    primary: <PrimaryFlow />,
    linear: <LinearWizard />,
    workbench: <WorkbenchFlow />,
    conditional: <ConditionalFlow />,
    preset: <PresetFlow />,
    assessment: <AssessmentFlow />,
  };

  const flow = flowMap[params.flow];

  if (!flow) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#18181b]">Flow niet gevonden</h1>
          <p className="text-[#71717a] mt-2">
            <Link href="/studyset/create" className="text-[#6b7c4e] hover:underline">
              Terug naar flow selectie
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <Suspense fallback={<div>Loading...</div>}>{flow}</Suspense>;
}
