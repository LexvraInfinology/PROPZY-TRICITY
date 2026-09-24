import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditAuditLog extends Document {
  targetUserId: mongoose.Types.ObjectId | string;
  targetUserEmail: string;
  targetUserName: string;
  performedById: mongoose.Types.ObjectId | string;
  performedByEmail: string;
  performedByName: string;
  performedByRole: string;
  actionType: 'increment' | 'decrement';
  deltaAmount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const CreditAuditLogSchema: Schema = new Schema({
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetUserEmail: { type: String, required: true },
  targetUserName: { type: String, default: '' },
  performedById: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  performedByEmail: { type: String, required: true },
  performedByName: { type: String, default: '' },
  performedByRole: { type: String, required: true },
  actionType: { type: String, enum: ['increment', 'decrement'], required: true },
  deltaAmount: { type: Number, required: true },
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  reason: { type: String, default: 'Sales Courtesy' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
}, { autoIndex: false });

CreditAuditLogSchema.index({ targetUserId: 1, createdAt: -1 });
CreditAuditLogSchema.index({ performedById: 1, createdAt: -1 });

export default mongoose.models.CreditAuditLog || mongoose.model<ICreditAuditLog>('CreditAuditLog', CreditAuditLogSchema);
