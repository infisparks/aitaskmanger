export interface StaffContact {
  id: string;
  name: string;
  phone: string; // e.g. "9876543210" or "919876543210"
  role?: string;
  department: string; // e.g. "Engineering", "Operations", "Sales"
  avatarColor?: string;
  active: boolean;
  createdAt: number;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignedStaffId: string;
  assignedStaffName: string;
  assignedStaffPhone: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: number;
  updatedAt: number;
  sourceVoiceTranscription?: string;
  whatsappSent: boolean;
  whatsappSentAt?: number;
  whatsappMessageId?: string;
  whatsappError?: string;
}

export interface ParsedStaffTask {
  staffId: string;
  staffName: string;
  staffPhone: string;
  matchedSpokenName: string;
  confidence: number;
  tasks: Array<{
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDate?: string;
  }>;
}

export interface VoiceParsingResponse {
  rawTranscription: string;
  assignments: ParsedStaffTask[];
  unmatchedTasks: string[];
  summary: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
