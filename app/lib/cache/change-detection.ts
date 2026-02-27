import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export class ChangeDetectionService {
  private supabase: any;

  constructor() {
    const cookieStore = cookies();
    this.supabase = createClient(cookieStore);
  }

  async hasClassChanged(classId: string, lastCheck: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('class_members')
        .select('updated_at', { count: 'exact' })
        .eq('class_id', classId)
        .gt('updated_at', lastCheck)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Change detection error for class:', error);
      return true; // Assume changed on error to be safe
    }
  }

  async hasGradesChanged(classId: string, lastCheck: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('submissions')
        .select('updated_at', { count: 'exact' })
        .eq('class_id', classId)
        .gt('updated_at', lastCheck)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Change detection error for grades:', error);
      return true; // Assume changed on error to be safe
    }
  }

  async hasAttendanceChanged(classId: string, lastCheck: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('attendance')
        .select('updated_at', { count: 'exact' })
        .eq('class_id', classId)
        .gt('updated_at', lastCheck)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Change detection error for attendance:', error);
      return true; // Assume changed on error to be safe
    }
  }

  async hasStudentsChanged(classId: string, lastCheck: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('class_members')
        .select('updated_at', { count: 'exact' })
        .eq('class_id', classId)
        .eq('role', 'student')
        .gt('updated_at', lastCheck)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Change detection error for students:', error);
      return true; // Assume changed on error to be safe
    }
  }

  async hasAssignmentsChanged(classId: string, lastCheck: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('assignments')
        .select('updated_at', { count: 'exact' })
        .eq('class_id', classId)
        .gt('updated_at', lastCheck)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Change detection error for assignments:', error);
      return true; // Assume changed on error to be safe
    }
  }

  async hasProgressChanged(classId: string, lastCheck: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('progress')
        .select('updated_at', { count: 'exact' })
        .eq('class_id', classId)
        .gt('updated_at', lastCheck)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Change detection error for progress:', error);
      return true; // Assume changed on error to be safe
    }
  }

  async checkMultipleChanges(classId: string, lastCheck: string): Promise<{
    class: boolean;
    students: boolean;
    grades: boolean;
    attendance: boolean;
    assignments: boolean;
    progress: boolean;
  }> {
    const [
      classChanged,
      studentsChanged,
      gradesChanged,
      attendanceChanged,
      assignmentsChanged,
      progressChanged
    ] = await Promise.all([
      this.hasClassChanged(classId, lastCheck),
      this.hasStudentsChanged(classId, lastCheck),
      this.hasGradesChanged(classId, lastCheck),
      this.hasAttendanceChanged(classId, lastCheck),
      this.hasAssignmentsChanged(classId, lastCheck),
      this.hasProgressChanged(classId, lastCheck)
    ]);

    return {
      class: classChanged,
      students: studentsChanged,
      grades: gradesChanged,
      attendance: attendanceChanged,
      assignments: assignmentsChanged,
      progress: progressChanged
    };
  }
}