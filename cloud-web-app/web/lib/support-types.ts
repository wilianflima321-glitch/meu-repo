export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketCategory =
  | 'billing'
  | 'technical'
  | 'account'
  | 'feature_request'
  | 'bug_report'
  | 'other';

export interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  channel: 'email' | 'chat' | 'web';
  assignedTo?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'system';
  content: string;
  attachments?: string[];
  createdAt: Date;
}

export interface UserPreferences {
  preferredChannel: 'chat' | 'email' | 'both';
  emailNotifications: boolean;
  chatNotifications: boolean;
  language: string;
}
