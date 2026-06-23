import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/support/contact
 *
 * Handle support contact form submissions.
 * Stores messages to a file and can integrate with:
 * - Email service (SendGrid, Resend, etc.)
 * - Ticketing system (Zendesk, Intercom, etc.)
 * - Slack notifications for the team
 */

interface ContactMessage {
  email: string;
  subject: string;
  message: string;
  errorCode?: string;
  timestamp: string;
  ip?: string;
}

const CONTACT_LOG_DIR = join(process.cwd(), '.data');
const CONTACT_LOG_FILE = join(CONTACT_LOG_DIR, 'contact-messages.jsonl');

async function appendContactMessage(msg: ContactMessage): Promise<void> {
  try {
    await mkdir(CONTACT_LOG_DIR, { recursive: true });
    const line = JSON.stringify(msg) + '\n';
    await writeFile(CONTACT_LOG_FILE, line, { flag: 'a' });
  } catch (err) {
    console.error('Failed to write to contact log:', err);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, subject, message, errorCode } = body;

    // Validate required fields
    if (!email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Get client IP for reference
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const contactMessage: ContactMessage = {
      email,
      subject,
      message,
      errorCode: errorCode || undefined,
      timestamp: new Date().toISOString(),
      ip,
    };

    // Store message
    await appendContactMessage(contactMessage);

    // TODO: In production, also:
    // - Send confirmation email to user
    // - Create support ticket in ticketing system
    // - Notify team via Slack
    // - Store in database for CRM integration
    //
    // Example:
    // const emailProvider = new SendGridService();
    // await emailProvider.sendConfirmation(email, contactMessage.subject);
    //
    // const slack = new SlackNotifier();
    // await slack.notifySupport(contactMessage);

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for contacting us. We will respond soon.',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in POST /api/support/contact:', err);
    return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 });
  }
}
