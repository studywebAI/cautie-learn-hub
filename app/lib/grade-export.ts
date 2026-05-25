import { GradeStats, GradeDistribution } from './grade-calculations';
import { BenchmarkScale } from './grade-coloring';

export interface StudentGradeRecord {
  studentId: string;
  studentName: string;
  grade: number | null;
  weight?: number;
  letterGrade?: string;
  color?: string;
}

export interface GradeSetExportData {
  title: string;
  class_name: string;
  subject_title?: string;
  created_at: string;
  status: string;
  weight?: number;
  students: StudentGradeRecord[];
  stats?: GradeStats;
  distribution?: GradeDistribution;
}

/**
 * Export grade set to HTML format with styling and stats
 */
export function exportGradesToHTML(
  gradeSet: GradeSetExportData,
  benchmark?: BenchmarkScale
): string {
  const timestamp = new Date().toLocaleString();
  const stats = gradeSet.stats;

  // Build student rows
  const studentRows = gradeSet.students
    .map(
      student => `
    <tr>
      <td class="px-4 py-2 border-b font-medium">${escapeHTML(student.studentName)}</td>
      <td class="px-4 py-2 border-b text-right">${student.grade !== null ? student.grade.toFixed(1) : '—'}</td>
      <td class="px-4 py-2 border-b text-center">
        <span class="px-2 py-1 rounded font-semibold text-white" style="background-color: ${student.color || '#e5e7eb'}">
          ${student.letterGrade || '—'}
        </span>
      </td>
      <td class="px-4 py-2 border-b text-right">${student.weight || '—'}</td>
    </tr>
  `
    )
    .join('');

  // Build distribution
  const distribution = gradeSet.distribution || { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const totalStudents = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(gradeSet.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #7f8962;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #111827;
    }
    .header-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      font-size: 13px;
      color: #6b7280;
    }
    .header-meta-item {
      display: flex;
      flex-direction: column;
    }
    .header-meta-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 2px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
      margin: 30px 0;
    }
    .stat-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
    }
    .stat-card-value {
      font-size: 24px;
      font-weight: 700;
      color: #7f8962;
      margin-bottom: 4px;
    }
    .stat-card-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table-container {
      overflow-x: auto;
      margin: 30px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    th {
      background: #f3f4f6;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px 16px;
    }
    .distribution {
      display: flex;
      gap: 12px;
      margin: 30px 0;
      flex-wrap: wrap;
    }
    .distribution-bar {
      flex: 1;
      min-width: 80px;
      background: #f9fafb;
      border-radius: 6px;
      overflow: hidden;
    }
    .distribution-bar-fill {
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }
    .distribution-bar-label {
      padding: 8px 12px;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      background: white;
      border-top: 1px solid #e5e7eb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
    }
    .no-print {
      display: block;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
      .container {
        max-width: 100%;
      }
      .stat-card, .distribution-bar {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${escapeHTML(gradeSet.title)}</h1>
      <div class="header-meta">
        <div class="header-meta-item">
          <span class="header-meta-label">Class</span>
          <span>${escapeHTML(gradeSet.class_name)}</span>
        </div>
        ${gradeSet.subject_title ? `
        <div class="header-meta-item">
          <span class="header-meta-label">Subject</span>
          <span>${escapeHTML(gradeSet.subject_title)}</span>
        </div>
        ` : ''}
        <div class="header-meta-item">
          <span class="header-meta-label">Exported</span>
          <span>${timestamp}</span>
        </div>
        <div class="header-meta-item">
          <span class="header-meta-label">Status</span>
          <span style="text-transform: capitalize;">${gradeSet.status}</span>
        </div>
      </div>
    </div>

    <!-- Statistics -->
    ${stats ? `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-value">${stats.average.toFixed(1)}</div>
        <div class="stat-card-label">Average</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${stats.median.toFixed(1)}</div>
        <div class="stat-card-label">Median</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${stats.min} – ${stats.max}</div>
        <div class="stat-card-label">Range</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${stats.stdDev.toFixed(2)}</div>
        <div class="stat-card-label">Std Dev</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${stats.count}</div>
        <div class="stat-card-label">Total Grades</div>
      </div>
    </div>
    ` : ''}

    <!-- Distribution -->
    ${distribution ? `
    <div class="distribution">
      <div class="distribution-bar">
        <div class="distribution-bar-fill" style="background-color: #10b981; width: ${(distribution.A / totalStudents) * 100}%; min-width: 40px;">
          ${distribution.A > 0 ? distribution.A : ''}
        </div>
        <div class="distribution-bar-label">Grade A</div>
      </div>
      <div class="distribution-bar">
        <div class="distribution-bar-fill" style="background-color: #8b5cf6; width: ${(distribution.B / totalStudents) * 100}%; min-width: 40px;">
          ${distribution.B > 0 ? distribution.B : ''}
        </div>
        <div class="distribution-bar-label">Grade B</div>
      </div>
      <div class="distribution-bar">
        <div class="distribution-bar-fill" style="background-color: #f59e0b; width: ${(distribution.C / totalStudents) * 100}%; min-width: 40px;">
          ${distribution.C > 0 ? distribution.C : ''}
        </div>
        <div class="distribution-bar-label">Grade C</div>
      </div>
      <div class="distribution-bar">
        <div class="distribution-bar-fill" style="background-color: #ef4444; width: ${(distribution.D / totalStudents) * 100}%; min-width: 40px;">
          ${distribution.D > 0 ? distribution.D : ''}
        </div>
        <div class="distribution-bar-label">Grade D</div>
      </div>
      <div class="distribution-bar">
        <div class="distribution-bar-fill" style="background-color: #6b7280; width: ${(distribution.F / totalStudents) * 100}%; min-width: 40px;">
          ${distribution.F > 0 ? distribution.F : ''}
        </div>
        <div class="distribution-bar-label">Grade F</div>
      </div>
    </div>
    ` : ''}

    <!-- Student Grades Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th style="text-align: right;">Grade</th>
            <th style="text-align: center;">Letter</th>
            <th style="text-align: right;">Weight</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Document generated on ${timestamp}</p>
      <p>Grade Set: ${escapeHTML(gradeSet.title)} • Class: ${escapeHTML(gradeSet.class_name)}</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Trigger browser print dialog for PDF export
 * Users can then select "Save as PDF" from print dialog
 */
export function exportGradesToPDF(
  gradeSet: GradeSetExportData,
  benchmark?: BenchmarkScale
): void {
  const html = exportGradesToHTML(gradeSet, benchmark);

  // Create a new window with the HTML
  const printWindow = window.open('', '', 'height=600,width=900');
  if (!printWindow) {
    console.error('Failed to open print window. Please check popup blocker settings.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Trigger print dialog after content loads
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Export grades to CSV format
 */
export function exportGradesToCSV(gradeSet: GradeSetExportData): string {
  const headers = ['Student Name', 'Grade', 'Letter Grade', 'Weight'];
  const rows = gradeSet.students.map(student => [
    escapeCSV(student.studentName),
    student.grade !== null ? student.grade.toFixed(1) : '',
    student.letterGrade || '',
    student.weight ? String(student.weight) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Trigger download of CSV file
 */
export function downloadGradesAsCSV(gradeSet: GradeSetExportData): void {
  const csv = exportGradesToCSV(gradeSet);
  const filename = `${sanitizeFilename(gradeSet.title)}_grades.csv`;

  downloadFile(csv, filename, 'text/csv');
}

/**
 * Helper: Escape HTML special characters
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Helper: Escape CSV special characters
 */
function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Helper: Sanitize filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Helper: Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
