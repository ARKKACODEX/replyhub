/**
 * Twilio IVR Menu Handler
 * Processes user menu selections
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const digits = formData.get('Digits') as string
    const callSid = formData.get('CallSid') as string
    const to = formData.get('To') as string

    // Find account and call
    const account = await prisma.account.findFirst({
      where: { twilioPhoneNumber: to },
    })

    const call = await prisma.call.findFirst({
      where: { callSid },
    })

    // Update IVR path
    if (call) {
      const currentPath = (call.ivrPath as any) || { steps: [] }
      currentPath.steps.push({
        menu: 'main',
        option: digits,
        timestamp: new Date().toISOString(),
      })

      await prisma.call.update({
        where: { id: call.id },
        data: { ivrPath: currentPath },
      })
    }

    let twiml = ''

    switch (digits) {
      case '1':
        // Schedule appointment
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">
              To schedule an appointment, please visit our website or press 2 to speak with someone now.
            </Say>
            <Gather numDigits="1" action="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/ivr-schedule" method="POST">
              <Say voice="Polly.Joanna">
                Press 1 to visit our website, or press 2 to speak with someone.
              </Say>
            </Gather>
          </Response>
        `
        break

      case '2':
        // Transfer to staff
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">Please hold while we connect you.</Say>
            ${
              account?.phone
                ? `<Dial timeout="30" action="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/dial-status"><Number>${account.phone}</Number></Dial>`
                : `<Say voice="Polly.Joanna">Sorry, no one is available right now. Please leave a message.</Say><Record maxLength="120"/>`
            }
          </Response>
        `
        break

      case '3':
        // Address and hours
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">
              We're located at ${account?.address || 'our main office'}.
              Our hours are Monday through Friday, 9 AM to 5 PM.
              You can also visit our website at ${account?.website || 'our website'}.
            </Say>
            <Pause length="2"/>
            <Redirect>${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice</Redirect>
          </Response>
        `
        break

      case '9':
        // Repeat menu
        twiml = `
          <Response>
            <Redirect>${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice</Redirect>
          </Response>
        `
        break

      default:
        // Invalid input
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">Sorry, that's not a valid option.</Say>
            <Redirect>${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice</Redirect>
          </Response>
        `
        break
    }

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Twilio IVR webhook error:', error)
    return handleAPIError(error)
  }
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
