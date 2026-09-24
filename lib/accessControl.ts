import type { JWTPayload } from '@/lib/auth';

export const normalizeEmail = (email?: string | null) => (email || '').toLowerCase().trim();

export const isAdminUser = (authUser?: JWTPayload | null) => authUser?.role === 'admin';

export const isSalesUser = (authUser?: JWTPayload | null) => {
  const role = (authUser?.role || '').toLowerCase().trim();
  return role === 'sales_executive' || role === 'sales executive';
};

export const isSalesOrAdmin = (authUser?: JWTPayload | null) =>
  isAdminUser(authUser) || isSalesUser(authUser);

export const canAccessSalesPortal = (authUser?: JWTPayload | null) =>
  isSalesOrAdmin(authUser);

export const isOwnedByUser = (ownerEmail: string | undefined, authUser?: JWTPayload | null) => {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedAuthEmail = normalizeEmail(authUser?.email);

  return Boolean(normalizedOwnerEmail && normalizedAuthEmail && normalizedOwnerEmail === normalizedAuthEmail);
};

const toPlainObject = (value: any) => {
  if (value && typeof value.toObject === 'function') {
    return value.toObject();
  }

  return { ...value };
};

export const serializeProperty = (property: any, includeSensitive = false) => {
  const plain = toPlainObject(property || {});
  const serialized: Record<string, any> = {
    ...plain,
    _id: plain._id?.toString?.() || plain._id,
  };

  if (serialized.createdAt instanceof Date) {
    serialized.createdAt = serialized.createdAt.toISOString();
  }

  if (!includeSensitive) {
    delete serialized.ownerName;
    delete serialized.ownerEmail;
    delete serialized.ownerPhone;
  }

  delete serialized.__v;
  return serialized;
};

// Contact details are private listing data. A signed-in visitor is not, by
// itself, allowed to receive them; only the owner of that listing or an admin
// may do so.
export const canViewPropertyContactDetails = (property: any, authUser?: JWTPayload | null) =>
  isAdminUser(authUser) || isOwnedByUser(property?.ownerEmail, authUser);

// API endpoints are consumed by the application with fetch/XHR. Do not render
// their JSON when somebody navigates to the endpoint in a browser tab.
export const isBrowserDocumentNavigation = (req: Request) =>
  req.headers.get('sec-fetch-dest') === 'document' ||
  req.headers.get('sec-fetch-mode') === 'navigate';
