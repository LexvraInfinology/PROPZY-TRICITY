import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  paymentId: string;
  signature?: string;
  userId?: mongoose.Types.ObjectId | string;
  userEmail: string;
  userPhone?: string;
  planId: 'standard' | 'premium' | string;
  planName: string;
  amount: number; // in INR
  currency: string;
  credits: number;
  validityDays: number;
  status: 'captured' | 'failed' | 'refunded' | 'pending';
  paymentMethod?: string;
  invoiceNo: string;
  processedVia: 'verify-api' | 'webhook';
  rawWebhookPayload?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, required: true, unique: true, index: true },
    signature: { type: String, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    userPhone: { type: String, default: '', trim: true },
    planId: { type: String, required: true, default: 'standard' },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    credits: { type: Number, required: true, default: 20 },
    validityDays: { type: Number, required: true, default: 30 },
    status: {
      type: String,
      enum: ['captured', 'failed', 'refunded', 'pending'],
      default: 'captured',
      index: true
    },
    paymentMethod: { type: String, default: 'Razorpay' },
    invoiceNo: { type: String, required: true, index: true },
    processedVia: {
      type: String,
      enum: ['verify-api', 'webhook'],
      required: true
    },
    rawWebhookPayload: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    autoIndex: true
  }
);

PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ userEmail: 1, createdAt: -1 });

const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment>) ||
  mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
