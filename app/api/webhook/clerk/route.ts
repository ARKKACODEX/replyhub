/**
 * Clerk Webhook Handler
 * Syncs user data between Clerk and our database
 */

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'

export async function POST(req: NextRequest) {
  try {
    // Get the headers
    const headerPayload = headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      )
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

    let evt: any

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    const eventType = evt.type

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      // Create account first
      const account = await prisma.account.create({
        data: {
          businessName: `${first_name}'s Business`,
          email: email_addresses[0].email_address,
          plan: 'STARTER',
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      })

      // Create user
      await prisma.user.create({
        data: {
          clerkId: id,
          email: email_addresses[0].email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
          accountId: account.id,
        },
      })

      console.log('User created:', id)
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      await prisma.user.update({
        where: { clerkId: id },
        data: {
          email: email_addresses[0].email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        },
      })

      console.log('User updated:', id)
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data

      // Soft delete the user's account
      const user = await prisma.user.findUnique({
        where: { clerkId: id },
        include: { account: true },
      })

      if (user) {
        await prisma.account.update({
          where: { id: user.accountId },
          data: { deletedAt: new Date() },
        })
      }

      console.log('User deleted:', id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAPIError(error)
  }
}

export const runtime = 'nodejs'
