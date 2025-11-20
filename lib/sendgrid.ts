/**
 * SendGrid Client Library
 * Handles email sending and templates
 */

import sgMail from '@sendgrid/mail'
import { prisma } from './db'
import { withRetry } from './retry'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

/**
 * Send email
 */
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  accountId?: string
  contactId?: string
}) {
  try {
    const msg = {
      to: params.to,
      from: params.from || process.env.SENDGRID_FROM_EMAIL!,
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ''),
    }

    const response = await withRetry(() => sgMail.send(msg))

    // Save to database if contactId provided
    if (params.accountId && params.contactId) {
      await prisma.message.create({
        data: {
          accountId: params.accountId,
          contactId: params.contactId,
          type: 'EMAIL',
          direction: 'OUTBOUND',
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          body: params.text || '',
          htmlBody: msg.html,
          status: 'SENT',
          sendgridId: response[0].headers['x-message-id'],
        },
      })

      // Track usage
      await prisma.account.update({
        where: { id: params.accountId },
        data: {
          emailsUsed: { increment: 1 },
        },
      })
    }

    return response
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(params: {
  to: string
  contactName: string
  businessName: string
  appointmentDate: string
  appointmentTime: string
  duration: number
  location?: string
  virtualMeetingUrl?: string
  accountId: string
  contactId: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #2563eb;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .detail {
      background: white;
      padding: 15px;
      margin: 15px 0;
      border-radius: 6px;
      border-left: 4px solid #2563eb;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .detail-value {
      font-size: 16px;
      color: #111827;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Appointment Confirmed</h1>
  </div>
  <div class="content">
    <p>Hi ${params.contactName},</p>
    <p>Your appointment with <strong>${params.businessName}</strong> has been confirmed!</p>

    <div class="detail">
      <div class="detail-label">Date & Time</div>
      <div class="detail-value">${params.appointmentDate} at ${params.appointmentTime}</div>
    </div>

    <div class="detail">
      <div class="detail-label">Duration</div>
      <div class="detail-value">${params.duration} minutes</div>
    </div>

    ${
      params.location
        ? `
    <div class="detail">
      <div class="detail-label">Location</div>
      <div class="detail-value">${params.location}</div>
    </div>
    `
        : ''
    }

    ${
      params.virtualMeetingUrl
        ? `
    <div class="detail">
      <div class="detail-label">Virtual Meeting</div>
      <div class="detail-value">
        <a href="${params.virtualMeetingUrl}">${params.virtualMeetingUrl}</a>
      </div>
    </div>
    `
        : ''
    }

    <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>

    <p>We look forward to seeing you!</p>

    <p>Best regards,<br>${params.businessName}</p>
  </div>

  <div class="footer">
    <p>This is an automated message from ${params.businessName}</p>
  </div>
</body>
</html>
  `

  return await sendEmail({
    to: params.to,
    subject: `Appointment Confirmed - ${params.appointmentDate}`,
    html,
    accountId: params.accountId,
    contactId: params.contactId,
  })
}

/**
 * Send appointment reminder
 */
export async function sendAppointmentReminder(params: {
  to: string
  contactName: string
  businessName: string
  appointmentDate: string
  appointmentTime: string
  hoursUntil: number
  accountId: string
  contactId: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #f59e0b;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Appointment Reminder</h1>
  </div>
  <p>Hi ${params.contactName},</p>
  <p>This is a friendly reminder about your upcoming appointment with <strong>${params.businessName}</strong>:</p>
  <p><strong>Date & Time:</strong> ${params.appointmentDate} at ${params.appointmentTime}<br>
  <strong>Time until appointment:</strong> ${params.hoursUntil} hours</p>
  <p>See you soon!</p>
  <p>Best regards,<br>${params.businessName}</p>
</body>
</html>
  `

  return await sendEmail({
    to: params.to,
    subject: `Reminder: Appointment in ${params.hoursUntil} hours`,
    html,
    accountId: params.accountId,
    contactId: params.contactId,
  })
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(params: {
  to: string
  name: string
  businessName: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #10b981;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to ${params.businessName}!</h1>
  </div>
  <p>Hi ${params.name},</p>
  <p>Thank you for choosing ${params.businessName}. We're excited to serve you!</p>
  <p>If you have any questions or need assistance, please don't hesitate to reach out.</p>
  <p>Best regards,<br>${params.businessName} Team</p>
</body>
</html>
  `

  return await sendEmail({
    to: params.to,
    subject: `Welcome to ${params.businessName}!`,
    html,
  })
}
