/**
 * Stripe Client Library
 * Handles billing, subscriptions, and usage tracking
 */

import Stripe from 'stripe'
import { prisma } from './db'
import { PlanType } from '@prisma/client'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

/**
 * Create Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string
  name: string
  accountId: string
}) {
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        accountId: params.accountId,
      },
    })

    // Update account with Stripe customer ID
    await prisma.account.update({
      where: { id: params.accountId },
      data: { stripeCustomerId: customer.id },
    })

    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

/**
 * Create subscription
 */
export async function createSubscription(params: {
  customerId: string
  priceId: string
  accountId: string
  trialDays?: number
}) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      trial_period_days: params.trialDays || 14,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        accountId: params.accountId,
      },
    })

    // Update account
    await prisma.account.update({
      where: { id: params.accountId },
      data: {
        stripeSubscriptionId: subscription.id,
        status: 'TRIAL',
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })

    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

/**
 * Calculate usage and create invoice for overages
 */
export async function calculateUsage(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) throw new Error('Account not found')

  // Plan limits
  const limits = {
    STARTER: { minutes: 500, sms: 1000, emails: 5000 },
    PRO: { minutes: 2000, sms: 5000, emails: 25000 },
    BUSINESS: { minutes: 10000, sms: 25000, emails: 100000 },
  }

  const planLimits = limits[account.plan]

  // Calculate overages
  const overages = {
    minutes: Math.max(0, account.minutesUsed - planLimits.minutes),
    sms: Math.max(0, account.smsUsed - planLimits.sms),
    emails: Math.max(0, account.emailsUsed - planLimits.emails),
  }

  // Overage rates (per unit in USD)
  const rates = {
    STARTER: { minutes: 0.20, sms: 0.08, emails: 0.02 },
    PRO: { minutes: 0.15, sms: 0.05, emails: 0.01 },
    BUSINESS: { minutes: 0.10, sms: 0.03, emails: 0.005 },
  }

  const planRates = rates[account.plan]

  // Calculate costs
  const costs = {
    minutes: overages.minutes * planRates.minutes,
    sms: overages.sms * planRates.sms,
    emails: overages.emails * planRates.emails,
  }

  const totalOverage = costs.minutes + costs.sms + costs.emails

  // Get plan price
  const planPrices = {
    STARTER: 179,
    PRO: 179,
    BUSINESS: 299,
  }

  const now = new Date()

  // Create usage record
  await prisma.usageRecord.create({
    data: {
      accountId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      billingPeriodStart: account.currentPeriodStart,
      billingPeriodEnd: account.currentPeriodEnd || now,
      plan: account.plan,
      planPrice: planPrices[account.plan],
      minutesIncluded: planLimits.minutes,
      minutesUsed: account.minutesUsed,
      minutesOverage: overages.minutes,
      smsIncluded: planLimits.sms,
      smsUsed: account.smsUsed,
      smsOverage: overages.sms,
      emailsIncluded: planLimits.emails,
      emailsUsed: account.emailsUsed,
      emailsOverage: overages.emails,
      baseCost: planPrices[account.plan],
      minutesCost: costs.minutes,
      smsCost: costs.sms,
      emailsCost: costs.emails,
      overageCost: totalOverage,
      totalCost: planPrices[account.plan] + totalOverage,
    },
  })

  // If overages > 0 and auto-pay enabled, charge
  if (totalOverage > 0 && account.autoPayOverages && account.stripeCustomerId) {
    await chargeOverages(account.stripeCustomerId, totalOverage, accountId)
  }

  return { overages, costs, totalOverage }
}

/**
 * Charge overages
 */
async function chargeOverages(customerId: string, amount: number, accountId: string) {
  try {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      description: 'Usage overages',
    })

    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
    })

    await stripe.invoices.pay(invoice.id)

    // Update usage record
    await prisma.usageRecord.updateMany({
      where: {
        accountId,
        stripeInvoiceId: null,
      },
      data: {
        stripeInvoiceId: invoice.id,
        stripePaid: true,
        stripePaidAt: new Date(),
      },
    })

    return invoice
  } catch (error) {
    console.error('Error charging overages:', error)
    throw error
  }
}

/**
 * Create checkout session
 */
export async function createCheckoutSession(params: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Create customer portal session
 */
export async function createPortalSession(customerId: string, returnUrl: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw error
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

/**
 * Update subscription
 */
export async function updateSubscription(params: {
  subscriptionId: string
  priceId: string
}) {
  try {
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)

    const updated = await stripe.subscriptions.update(params.subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: params.priceId,
        },
      ],
    })

    return updated
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}
