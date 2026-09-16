import { PropertyItem } from './seedData';

export interface MemoryUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'tenant' | 'owner' | 'admin';
  ownerVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  consumerNumber?: string;
  electricityBillUrl?: string;
}

export const memoryStore: PropertyItem[] = [];

export const memoryUsers: MemoryUser[] = [
  { id: 'usr-001', name: 'Raj Shamani', email: 'raj@gmail.com', phone: '+91 98765 43210', role: 'owner' },
  { id: 'usr-002', name: 'Aman Kumar', email: 'aman@propzy.com', phone: '+91 98765 11111', role: 'owner' },
  { id: 'usr-003', name: 'Priya Sharma', email: 'tenant@propzy.com', phone: '+91 98765 22222', role: 'tenant' },
];
