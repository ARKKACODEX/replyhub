/**
 * Twilio Call Status Callback
 * Updates call records with status changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingSid = formData.get('RecordingSid') as string

    // Update call in database
    const call = await prisma.call.findFirst({
      where: { callSid },
    })

    if (call) {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          status: callStatus.toUpperCase() as any,
          duration: callDuration ? parseInt(callDuration) : null,
          recordingUrl: recordingUrl || undefined,
          recordingSid: recordingSid || undefined,
        },
      })

      // Track minutes usage if call completed
      if (callStatus === 'completed' && callDuration) {
        const minutes = Math.ceil(parseInt(callDuration) / 60)
        await prisma.account.update({
          where: { id: call.accountId },
          data: {
            minutesUsed: { increment: minutes },
          },
        })
      }

      // Create activity
      await prisma.activity.create({
        data: {
          accountId: call.accountId,
          contactId: call.contactId,
          type: 'CALL_RECEIVED',
          title: `Call ${callStatus}`,
          description: `Call duration: ${callDuration || 0} seconds`,
          metadata: {
            callSid,
            callStatus,
            recordingUrl,
          },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Twilio status webhook error:', error)
    return handleAPIError(error)
  }
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
