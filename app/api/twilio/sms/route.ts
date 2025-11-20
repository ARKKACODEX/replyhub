/**
 * Twilio SMS Webhook
 * Handles incoming SMS messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const messageSid = formData.get('MessageSid') as string

    // Find account
    const account = await prisma.account.findFirst({
      where: { twilioPhoneNumber: to },
    })

    if (!account) {
      return new NextResponse('Account not found', { status: 404 })
    }

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: { accountId: account.id, phone: from },
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          accountId: account.id,
          firstName: 'Unknown',
          fullName: 'Unknown',
          phone: from,
          source: 'PHONE_CALL',
        },
      })
    }

    // Save message
    await prisma.message.create({
      data: {
        accountId: account.id,
        contactId: contact.id,
        type: 'SMS',
        direction: 'INBOUND',
        from,
        to,
        body,
        status: 'RECEIVED',
        twilioSid: messageSid,
      },
    })

    // Create activity
    await prisma.activity.create({
      data: {
        accountId: account.id,
        contactId: contact.id,
        type: 'SMS_RECEIVED',
        title: 'SMS received',
        description: body,
      },
    })

    // Auto-reply
    const response = `
      <Response>
        <Message>
          Thanks for texting ${account.businessName}! We'll get back to you soon. Reply STOP to unsubscribe.
        </Message>
      </Response>
    `

    return new NextResponse(response, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Twilio SMS webhook error:', error)
    return handleAPIError(error)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
