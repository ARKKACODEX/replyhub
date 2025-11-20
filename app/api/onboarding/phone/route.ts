import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'
import { provisionPhoneNumber } from '@/lib/twilio'
import { z } from 'zod'

export const runtime = 'nodejs'

const phoneSchema = z.object({
  areaCode: z.string().length(3).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = phoneSchema.parse(body)

    // Get user's account
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: { account: true },
    })

    if (!dbUser || !dbUser.account) {
      return NextResponse.json(
        { error: { message: 'Account not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    // Check if already has a phone number
    if (dbUser.account.twilioPhoneNumber) {
      return NextResponse.json({
        success: true,
        phoneNumber: dbUser.account.twilioPhoneNumber,
        message: 'Phone number already provisioned',
      })
    }

    // Provision phone number through Twilio
    const result = await provisionPhoneNumber({
      accountId: dbUser.account.id,
      areaCode: data.areaCode,
    })

    return NextResponse.json({
      success: true,
      phoneNumber: result.phoneNumber,
      message: 'Phone number successfully provisioned',
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
