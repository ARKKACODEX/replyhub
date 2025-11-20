/**
 * Twilio Voice Webhook
 * Handles incoming calls with IVR menu
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callSid = formData.get('CallSid') as string

    // Find account by phone number
    const account = await prisma.account.findFirst({
      where: { twilioPhoneNumber: to },
      include: { knowledgeBase: true },
    })

    if (!account) {
      const response = `
        <Response>
          <Say voice="Polly.Joanna">This number is not configured. Goodbye.</Say>
          <Hangup/>
        </Response>
      `
      return new NextResponse(response, {
        headers: { 'Content-Type': 'text/xml' },
      })
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

    // Save call to database
    await prisma.call.create({
      data: {
        accountId: account.id,
        contactId: contact.id,
        from,
        to,
        direction: 'INBOUND',
        status: 'IN_PROGRESS',
        callSid,
      },
    })

    // Check business hours
    const now = new Date()
    const businessHours = account.businessHours as any
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })

    const isOpen =
      businessHours?.[dayOfWeek]?.closed === false &&
      currentTime >= businessHours?.[dayOfWeek]?.open &&
      currentTime <= businessHours?.[dayOfWeek]?.close

    // Generate TwiML response
    let twiml = ''

    if (!isOpen) {
      // After hours - voicemail
      twiml = `
        <Response>
          <Say voice="Polly.Joanna">
            Thank you for calling ${account.businessName}.
            We're currently closed. Our business hours are Monday through Friday, 9 AM to 5 PM.
            Please leave a message after the beep.
          </Say>
          <Record maxLength="120" playBeep="true" transcribe="true"
                  transcribeCallback="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/transcription"/>
          <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
          <Hangup/>
        </Response>
      `
    } else {
      // Business hours - IVR menu
      twiml = `
        <Response>
          <Gather numDigits="1" action="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/ivr" method="POST" timeout="10">
            <Say voice="Polly.Joanna">
              Thank you for calling ${account.businessName}.
              Press 1 to schedule an appointment.
              Press 2 to speak with someone.
              Press 3 for our address and hours.
              Press 9 to repeat this menu.
            </Say>
          </Gather>
          <Redirect>${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice</Redirect>
        </Response>
      `
    }

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Twilio voice webhook error:', error)
    return handleAPIError(error)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
