/**
 * Stripe Webhook Handler
 * Processes subscription and payment events
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { handleAPIError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return handleAPIError(error)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const accountId = subscription.metadata.accountId

  if (!accountId) return

  const status =
    subscription.status === 'active'
      ? 'ACTIVE'
      : subscription.status === 'past_due'
      ? 'PAST_DUE'
      : subscription.status === 'canceled'
      ? 'CANCELED'
      : 'TRIAL'

  await prisma.account.update({
    where: { id: accountId },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`Subscription updated for account ${accountId}: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const accountId = subscription.metadata.accountId

  if (!accountId) return

  await prisma.account.update({
    where: { id: accountId },
    data: {
      status: 'CANCELED',
    },
  })

  console.log(`Subscription canceled for account ${accountId}`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const account = await prisma.account.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!account) return

  // Reset usage for new billing period
  await prisma.account.update({
    where: { id: account.id },
    data: {
      minutesUsed: 0,
      smsUsed: 0,
      emailsUsed: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  console.log(`Invoice paid for account ${account.id}, usage reset`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const account = await prisma.account.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!account) return

  await prisma.account.update({
    where: { id: account.id },
    data: {
      status: 'PAST_DUE',
    },
  })

  console.log(`Payment failed for account ${account.id}`)

  // TODO: Send notification email to customer
}

export const runtime = 'nodejs'
