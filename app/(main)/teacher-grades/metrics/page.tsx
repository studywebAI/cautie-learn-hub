'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GradeMetrics from '@/components/grades/grade-metrics';
import Loader from '@/components/ui/loader';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { CategoryWeightsPanel } from '@/components/grades/category-weights-panel';
import { PageHeader } from '@/components/page-header';

type Class = {
  id: string;
  name: string;
};

type GradeSet = {
  id: string;
  title: string;
  class_id: string;
  subject?: { title?: string } | null;
  weight?: number;
};

export default function MetricsPage() {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const classes = (context?.classes || []) as Class[];
  const standaloneSubjects = (context?.subjects || []).filter((s: any) => !Array.isArray(s.classes) || s.classes.length === 0);

  // "class:<id>" or "subject:<id>" -- one Select covers both scope types.
  const [selectedScope, setSelectedScope] = useState<string>(classes[0]?.id ? `class:${classes[0].id}` : '');
  const [allGradeSets, setAllGradeSets] = useState<GradeSet[]>([]);
  const [selectedGradeSetIds, setSelectedGradeSetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [scopeType, scopeId] = selectedScope.split(':') as ['class' | 'subject' | '', string];
  const selectedClassId = scopeType === 'class' ? scopeId : '';
  const selectedSubjectId = scopeType === 'subject' ? scopeId : '';

  // Load grade sets for the selected class or standalone subject
  useEffect(() => {
    if (!scopeId) {
      setAllGradeSets([]);
      setSelectedGradeSetIds([]);
      return;
    }

    const loadGradeSets = async () => {
      setLoading(true);
      try {
        const res = await fetch(scopeType === 'class' ? `/api/classes/${scopeId}/grades` : `/api/subjects/${scopeId}/grades`);
        if (!res.ok) {
          setAllGradeSets([]);
          setSelectedGradeSetIds([]);
          return;
        }

        const data = await res.json();
        const gradeSets = (data.grade_sets || []) as GradeSet[];
        setAllGradeSets(gradeSets);
        setSelectedGradeSetIds([]);
      } catch (err) {
        console.error('Error loading grade sets:', err);
        setAllGradeSets([]);
        setSelectedGradeSetIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadGradeSets();
  }, [scopeType, scopeId]);

  const toggleGradeSet = (gradeSetId: string) => {
    setSelectedGradeSetIds(prev =>
      prev.includes(gradeSetId)
        ? prev.filter(id => id !== gradeSetId)
        : [...prev, gradeSetId]
    );
  };

  const filteredGradeSets = useMemo(() => {
    if (scopeType === 'class') return allGradeSets.filter(gs => gs.class_id === selectedClassId);
    return allGradeSets;
  }, [allGradeSets, scopeType, selectedClassId]);

  return (
    <div className="page-content max-w-6xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div>
        <Link href="/teacher-grades">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="h-4 w-4" />
            {isDutch ? 'Terug' : 'Back'}
          </button>
        </Link>
        <PageHeader
          title={isDutch ? 'Cijfer Metrics' : 'Grade Metrics'}
          subtitle={isDutch ? 'Vergelijk en analyseer cijferlijsten' : 'Compare and analyze grade sets'}
        />
      </div>

      {/* Class / standalone subject selection */}
      <div className="space-y-2">
        <label className="text-sm">
          {isDutch ? 'Selecteer Klas of Vak' : 'Select Class or Subject'}
        </label>
        <Select value={selectedScope} onValueChange={setSelectedScope}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={`class:${cls.id}`}>
                {cls.name}
              </SelectItem>
            ))}
            {standaloneSubjects.map((subj: any) => (
              <SelectItem key={subj.id} value={`subject:${subj.id}`}>
                {subj.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scopeId && <CategoryWeightsPanel classId={selectedClassId || null} subjectId={selectedSubjectId || null} isDutch={isDutch} />}

      {/* Grade set selection */}
      {scopeId && (
        <div className="space-y-3">
          <div>
            <p className="text-sm mb-2">
              {isDutch ? 'Selecteer Cijferlijsten' : 'Select Grade Sets'} ({selectedGradeSetIds.length})
            </p>
            <p className="text-xs text-muted-foreground">
              {isDutch
                ? 'Selecteer 2 of meer om te vergelijken'
                : 'Select 2 or more to compare'}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <CautieLoader label="" size="sm" />
            </div>
          ) : filteredGradeSets.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground rounded-lg border border-dashed border-border">
              {isDutch
                ? 'Geen cijferlijsten gevonden'
                : 'No grade sets found'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredGradeSets.map(gset => (
                <button
                  key={gset.id}
                  onClick={() => toggleGradeSet(gset.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedGradeSetIds.includes(gset.id)
                      ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/5'
                      : 'border-border hover:border-[var(--accent-brand)]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedGradeSetIds.includes(gset.id)
                          ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)]'
                          : 'border-border'
                      }`}
                    >
                      {selectedGradeSetIds.includes(gset.id) && (
                        <div className="w-2 h-2 bg-white rounded-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{gset.title}</p>
                      {gset.subject?.title && (
                        <p className="text-xs text-muted-foreground">
                          {gset.subject.title}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics display */}
      {scopeId && selectedGradeSetIds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
            <h2 className="text-base">
              {isDutch ? 'Analyse' : 'Analysis'} ({selectedGradeSetIds.length} {isDutch ? 'sets' : 'sets'})
            </h2>
            <Button variant="outline" size="sm">
              {isDutch ? 'Exporteren' : 'Export'}
            </Button>
          </div>
          <GradeMetrics classId={selectedClassId || null} subjectId={selectedSubjectId || null} selectedGradeSets={selectedGradeSetIds} />
        </div>
      )}

      {/* Empty state */}
      {scopeId && selectedGradeSetIds.length === 0 && filteredGradeSets.length > 0 && (
        <div className="p-8 text-center rounded-lg border border-dashed border-border space-y-3">
          <p className="text-sm text-muted-foreground">
            {isDutch
              ? 'Selecteer 2 of meer cijferlijsten om vergelijking te zien'
              : 'Select 2 or more grade sets to see comparison'}
          </p>
        </div>
      )}
    </div>
  );
}
