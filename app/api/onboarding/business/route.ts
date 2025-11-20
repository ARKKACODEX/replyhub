import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'
import { z } from 'zod'

export const runtime = 'nodejs'

const businessSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  industry: z.enum([
    'healthcare',
    'retail',
    'restaurant',
    'automotive',
    'real-estate',
    'professional-services',
    'other',
  ]),
  timezone: z.string(),
  website: z.string().url().optional().or(z.literal('')),
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
    const data = businessSchema.parse(body)

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

    // Update account with business info
    const updatedAccount = await prisma.account.update({
      where: { id: dbUser.account.id },
      data: {
        businessName: data.businessName,
        industry: data.industry,
        timezone: data.timezone,
        website: data.website || null,
      },
    })

    return NextResponse.json({
      success: true,
      account: {
        id: updatedAccount.id,
        businessName: updatedAccount.businessName,
        industry: updatedAccount.industry,
        timezone: updatedAccount.timezone,
        website: updatedAccount.website,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
