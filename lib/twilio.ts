/**
 * Twilio Client Library
 * Handles VoIP calls, SMS, and phone number provisioning
 */

import twilio from 'twilio'
import { prisma } from './db'
import { withRetry } from './retry'

// Lazy initialization of Twilio client to prevent build-time errors
let twilioClientInstance: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!twilioClientInstance) {
    twilioClientInstance = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }
  return twilioClientInstance
}

/**
 * Provision a new phone number for a customer
 */
export async function provisionPhoneNumber(params: {
  accountId: string
  areaCode?: string
  country?: string
}) {
  const { accountId, areaCode = '415', country = 'US' } = params
  const twilioClient = getTwilioClient()

  try {
    // Search for available numbers
    const numbers = await withRetry(() =>
      twilioClient.availablePhoneNumbers(country).local.list({
        areaCode: areaCode ? parseInt(areaCode) : undefined,
        limit: 5,
      })
    )

    if (numbers.length === 0) {
      throw new Error(`No phone numbers available in area code ${areaCode}`)
    }

    // Buy the first available number
    const phoneNumber = await withRetry(() =>
      twilioClient.incomingPhoneNumbers.create({
        phoneNumber: numbers[0].phoneNumber,
        voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
        voiceMethod: 'POST',
        smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms`,
        smsMethod: 'POST',
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
        statusCallbackMethod: 'POST',
        friendlyName: `ReplyHub - ${accountId}`,
      })
    )

    // Update account with phone number
    await prisma.account.update({
      where: { id: accountId },
      data: {
        twilioPhoneNumber: phoneNumber.phoneNumber,
        twilioPhoneSid: phoneNumber.sid,
      },
    })

    return {
      phoneNumber: phoneNumber.phoneNumber,
      sid: phoneNumber.sid,
    }
  } catch (error) {
    console.error('Error provisioning phone number:', error)
    throw error
  }
}

/**
 * Send SMS message
 */
export async function sendSMS(params: {
  to: string
  from: string
  body: string
  accountId: string
  contactId?: string
}) {
  const twilioClient = getTwilioClient()

  try {
    const message = await withRetry(() =>
      twilioClient.messages.create({
        to: params.to,
        from: params.from,
        body: params.body,
      })
    )

    // Save to database
    if (params.contactId) {
      await prisma.message.create({
        data: {
          accountId: params.accountId,
          contactId: params.contactId,
          type: 'SMS',
          direction: 'OUTBOUND',
          from: params.from,
          to: params.to,
          body: params.body,
          status: 'SENT',
          twilioSid: message.sid,
          cost: message.price ? parseFloat(message.price) : 0,
        },
      })

      // Track usage
      await prisma.account.update({
        where: { id: params.accountId },
        data: {
          smsUsed: { increment: 1 },
        },
      })
    }

    return message
  } catch (error) {
    console.error('Error sending SMS:', error)
    throw error
  }
}

/**
 * Make outbound call
 */
export async function makeCall(params: {
  to: string
  from: string
  twiml: string
  accountId: string
  contactId?: string
}) {
  const twilioClient = getTwilioClient()

  try {
    const call = await withRetry(() =>
      twilioClient.calls.create({
        to: params.to,
        from: params.from,
        twiml: params.twiml,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
        statusCallbackMethod: 'POST',
        record: true,
      })
    )

    // Save to database
    if (params.contactId) {
      await prisma.call.create({
        data: {
          accountId: params.accountId,
          contactId: params.contactId,
          from: params.from,
          to: params.to,
          direction: 'OUTBOUND',
          status: 'INITIATED',
          callSid: call.sid,
        },
      })
    }

    return call
  } catch (error) {
    console.error('Error making call:', error)
    throw error
  }
}

/**
 * Get call recording
 */
export async function getRecording(recordingSid: string) {
  const twilioClient = getTwilioClient()

  try {
    const recording = await twilioClient.recordings(recordingSid).fetch()
    return {
      url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
      duration: parseInt(recording.duration),
    }
  } catch (error) {
    console.error('Error fetching recording:', error)
    throw error
  }
}

/**
 * Generate TwiML for IVR menu
 */
export function generateIVRMenu(params: {
  businessName: string
  greeting?: string
}) {
  const { businessName, greeting } = params

  return `
    <Response>
      <Gather numDigits="1" action="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/ivr" method="POST" timeout="10">
        <Say voice="Polly.Joanna">
          ${greeting || `Thank you for calling ${businessName}.`}
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

/**
 * Generate TwiML for voicemail
 */
export function generateVoicemailTwiML(params: {
  businessName: string
  message?: string
}) {
  const { businessName, message } = params

  return `
    <Response>
      <Say voice="Polly.Joanna">
        ${message || `Thank you for calling ${businessName}. We're currently closed.`}
        Please leave a message after the beep.
      </Say>
      <Record maxLength="120" playBeep="true" transcribe="true" transcribeCallback="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/transcription" />
      <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
      <Hangup />
    </Response>
  `
}
