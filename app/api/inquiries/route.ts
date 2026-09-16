import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Inquiry from '@/models/Inquiry';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { normalizeEmail, isAdminUser } from '@/lib/accessControl';

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);

  if (!authUser) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Please login.' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    if (isAdminUser(authUser)) {
      const dbInquiries = await Inquiry.find().sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, data: dbInquiries || [] });
    }

    const dbUser: any = await User.findOne({ email: normalizeEmail(authUser.email) }).select('email phone name').lean();
    const currentEmail = normalizeEmail(dbUser?.email || authUser.email);
    const currentPhone = (dbUser?.phone || '').replace(/\D/g, '').slice(-10);
    const currentName = (dbUser?.name || authUser.name || '').toLowerCase().trim();

    const orClauses: any[] = [];
    if (currentEmail) {
      orClauses.push({ tenantEmail: new RegExp(`^${currentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }
    if (currentPhone) {
      orClauses.push({ tenantPhone: new RegExp(`${currentPhone}$`) });
    }
    if (currentName) {
      orClauses.push({ tenantName: new RegExp(`^${currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }

    const filter = orClauses.length > 0 ? { $or: orClauses } : { _id: null };
    const visible = await Inquiry.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: visible || [] });
  } catch (err) {
    console.warn('DB read error for inquiries:', err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const body = await req.json();

    const newInquiry = {
      propertyId: body.propertyId || `relax-${Date.now()}`,
      propertyTitle: body.propertyTitle || 'Property Inquiry',
      propertyPid: body.propertyPid || 'RELAX-PLAN',
      tenantName: body.tenantName,
      tenantPhone: body.tenantPhone,
      tenantEmail: body.tenantEmail || normalizeEmail(authUser?.email),
      tenantMessage: body.tenantMessage || '',
      status: body.status || 'New',
      createdAt: new Date()
    };

    await connectToDatabase();
    const created = await Inquiry.create(newInquiry);
    return NextResponse.json({ 
      success: true, 
      data: created, 
      message: 'Your inquiry has been submitted successfully!' 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to submit request' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser || !isAdminUser(authUser)) {
    return NextResponse.json({ success: false, message: 'Admin authorization required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'Missing id or status' }, { status: 400 });
    }

    await connectToDatabase();
    let updated = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await Inquiry.findByIdAndUpdate(id, { status }, { new: true });
    }
    if (!updated) {
      updated = await Inquiry.findOneAndUpdate(
        { $or: [{ _id: id }, { propertyId: id }, { propertyPid: id }] },
        { status },
        { new: true }
      );
    }
    return NextResponse.json({ success: true, data: updated || { id, status } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to update inquiry status' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser || !isAdminUser(authUser)) {
    return NextResponse.json({ success: false, message: 'Admin authorization required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing inquiry id' }, { status: 400 });
    }

    await connectToDatabase();
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      await Inquiry.findByIdAndDelete(id);
    } else {
      await Inquiry.findOneAndDelete({ $or: [{ _id: id }, { propertyId: id }] });
    }
    return NextResponse.json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to delete inquiry' }, { status: 500 });
  }
}
