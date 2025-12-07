import { ReactNode } from 'react';

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface OperationalShift {
  title: string;
  icon: ReactNode;
  color: string;
  items: ChecklistItem[];
}

export interface OperationalData {
  [key: string]: OperationalShift;
}

export interface QcLog {
  branchName: string;
  reportDate: string;
  shift: string;
  menuName: string;
  taste: string;
  texture: string;
  plating: string;
  notes: string;
  chefSignature: string | null;
  supervisorSignature: string | null;
}

export interface CleaningLog {
  area: string;
  reportDate: string;
  shift: string;
  timeBefore: string;
  timeAfter: string;
  description: string;
  photosBefore: string[];
  photosAfter: string[];
  supervisorSignature: string | null;
}

export interface DailyReport {
  id: string; // usually the date string YYYY-MM-DD
  dateFormatted: string;
  checks: Record<string, boolean>;
  qc: QcLog;
  cleaning: CleaningLog;
  timestamp: number;
  // New folder structure fields
  archiveLocation: string; // e.g., "Cimahi 1"
  archiveFolder: string;   // e.g., "Pagi"
}

export type TabType = 'pagi' | 'siang' | 'malam' | 'log_qc' | 'cleaning_log' | 'riwayat';
