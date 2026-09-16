import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ContactMessage from '@/models/ContactMessage';
import { getAuthUser } from '@/lib/auth';
import { isAdminUser } from '@/lib/accessControl';

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);

  // Protected: Only authenticated users can access
  if (!authUser) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Please login.' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    if (isAdminUser(authUser)) {
      const dbMessages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, data: dbMessages || [] });
    }

    // Regular users see only their own contact submissions directly via indexed workEmail query
    const userEmail = (authUser.email || '').toLowerCase().trim();
    const userMessages = await ContactMessage.find({
      workEmail: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: userMessages || [] });
  } catch (err: any) {
    console.error('MongoDB contacts GET error:', err);
    return NextResponse.json({ success: false, message: 'Failed to retrieve contact messages', data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, workEmail, company, inquiryType, message } = body;

    if (!fullName || !workEmail || !message) {
      return NextResponse.json(
        { success: false, message: 'Please provide full name, email, and message.' },
        { status: 400 }
      );
    }

    const newContact = {
      fullName: fullName.trim(),
      workEmail: workEmail.toLowerCase().trim(),
      company: (company || '').trim(),
      inquiryType: (inquiryType || 'General Inquiry').trim(),
      message: message.trim(),
      status: 'pending',
      createdAt: new Date()
    };

    await connectToDatabase();
    const created = await ContactMessage.create(newContact);

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Your message has been received! Our support team will get back to you shortly.'
    });
  } catch (err: any) {
    console.error('Contact submission error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to submit contact message' },
      { status: 500 }
    );
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
    const updated = await ContactMessage.findByIdAndUpdate(id, { status }, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Contact status update error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to update contact status' }, { status: 500 });
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
      return NextResponse.json({ success: false, message: 'Missing message id' }, { status: 400 });
    }

    await connectToDatabase();
    await ContactMessage.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Message deleted successfully from database' });
  } catch (err: any) {
    console.error('Contact delete error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to delete message' }, { status: 500 });
  }
}
