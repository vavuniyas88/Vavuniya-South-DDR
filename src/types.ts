export type Language = 'ta' | 'en' | 'si';

export type UserRole = 'admin' | 'officer';

export type DutyStatus = 'saved' | 'submitted' | 'approved';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  designation: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface DutyEntry {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  remarks: string;
  status: DutyStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  officerName?: string;
  officerUsername?: string;
  officerDesignation?: string;
  officerRole?: UserRole;
}

export interface DraftDutyRow {
  localId: string;
  startTime: string;
  endTime: string;
  description: string;
  remarks: string;
}
