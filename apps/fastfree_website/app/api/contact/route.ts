import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ContactBody = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: ContactBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const phone = body.phone?.trim() ?? '';
  const subject = body.subject?.trim() ?? '';
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      {
        success: false,
        error: 'Name, email and message are required / الاسم والبريد الإلكتروني والرسالة مطلوبة',
      },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid email format / صيغة البريد الإلكتروني غير صحيحة',
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      // @ts-ignore - resend is optional and not installed by default
      const { Resend } = await import('resend').catch(() => ({ Resend: null }));
      if (Resend) {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: 'contact@fastfree.com',
          to: 'contact@fastfree.com',
          subject: subject ? `New contact: ${subject} (from ${name})` : `New contact message from ${name}`,
          replyTo: email,
          text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}\n\n${message}`,
        });
      } else {
        console.log('[contact] Resend not installed; skipping email send');
      }
    } catch (err) {
      console.error('[contact] Failed to send email:', err);
    }
  } else {
    console.log('[contact] RESEND_API_KEY not set; skipping email send');
  }

  return NextResponse.json({ success: true });
}
