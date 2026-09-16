import mongoose, { Schema, Document } from 'mongoose';

export interface IProperty extends Document {
  pid: string;
  title: string;
  category: 'rent' | 'buy' | 'sell' | 'pg' | 'commercial';
  type: 'house' | 'flat' | 'pg' | 'commercial' | 'plot';
  city: string;
  locality: string;
  address: string;
  price: number | string;
  deposit?: number | string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqFt?: number;
  furnishing: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
  verified: boolean;
  featured: boolean;
  images: string[];
  videos?: string[];
  videoThumbnail?: string;
  description: string;
  amenities: string[];
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerRole: 'owner' | 'agent';
  available: boolean;
  createdAt: Date;
}

const PropertySchema: Schema = new Schema({
  pid: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['rent', 'buy', 'sell', 'pg', 'commercial'], 
    required: true
  },
  type: { 
    type: String, 
    enum: ['house', 'flat', 'pg', 'commercial', 'plot'], 
    required: true 
  },
  city: { type: String, required: true },
  locality: { type: String, required: true, index: true },
  address: { type: String, required: true },
  price: { type: Schema.Types.Mixed, required: true },
  deposit: { type: Schema.Types.Mixed, default: 0 },
  bedrooms: { type: Number, default: 1 },
  bathrooms: { type: Number, default: 1 },
  areaSqFt: { type: Number },
  furnishing: { 
    type: String, 
    enum: ['unfurnished', 'semi-furnished', 'fully-furnished'], 
    default: 'semi-furnished' 
  },
  verified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  images: [{ type: String }],
  videos: [{ type: String }],
  videoThumbnail: { type: String, default: '' },
  description: { type: String, required: true },
  amenities: [{ type: String }],
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerEmail: { type: String, default: '', index: true },
  ownerRole: { type: String, enum: ['owner', 'agent'], default: 'owner' },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { autoIndex: false });

// Compound indexes for query + sort optimizations
PropertySchema.index({ price: 1, createdAt: -1 });
PropertySchema.index({ category: 1, city: 1, verified: 1, createdAt: -1 });
PropertySchema.index({ city: 1, category: 1, verified: 1, createdAt: -1 });
PropertySchema.index({ type: 1, bedrooms: 1, verified: 1, createdAt: -1 });
PropertySchema.index({ verified: 1, createdAt: -1 });

export default mongoose.models.Property || mongoose.model<IProperty>('Property', PropertySchema);
