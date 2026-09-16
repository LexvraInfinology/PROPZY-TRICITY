export interface PropertyItem {
  _id?: string;
  id: string;
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
  video?: string;
  videoThumbnail?: string;
  description: string;
  amenities: string[];
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerRole: 'owner' | 'agent';
  available: boolean;
  createdAt: string;
}

export interface InquiryItem {
  _id?: string;
  id?: string;
  propertyId: string;
  propertyTitle: string;
  propertyPid: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  tenantMessage: string;
  status: 'pending' | 'contacted' | 'resolved';
  createdAt: string;
}

// Strict empty initial arrays - only real database documents will be loaded
export const INITIAL_PROPERTIES: PropertyItem[] = [];

export const INITIAL_INQUIRIES: InquiryItem[] = [];
