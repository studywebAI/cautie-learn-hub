import { Suspense } from 'react';
import StudysetDashboard from './dashboard';

export const metadata = {
  title: 'Studysets',
  description: 'Je studyset overzicht en analytics',
};

export default function StudysetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudysetDashboard />
    </Suspense>
  );
}
