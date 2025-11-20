import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'

export default async function BillingPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { account: true },
  })

  if (!dbUser || !dbUser.account) {
    redirect('/onboarding')
  }

  const account = dbUser.account

  // Calculate usage percentages
  const minutesPercentage = (account.minutesUsed / account.minutesLimit) * 100
  const smsPercentage = (account.smsUsed / account.smsLimit) * 100
  const emailsPercentage = (account.emailsUsed / account.emailsLimit) * 100

  // Get recent usage records and invoices
  const [usageRecords, invoices] = await Promise.all([
    prisma.usageRecord.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // In production, fetch from Stripe invoices
    // For now, return empty array
    Promise.resolve([]),
  ])

  // Plan pricing
  const plans = {
    STARTER: {
      name: 'Starter',
      price: 49,
      features: [
        '500 call minutes/month',
        '200 SMS messages/month',
        '500 emails/month',
        '1 phone number',
        'Basic analytics',
        'Email support',
      ],
    },
    PRO: {
      name: 'Pro',
      price: 149,
      features: [
        '2,000 call minutes/month',
        '1,000 SMS messages/month',
        '2,000 emails/month',
        '3 phone numbers',
        'Advanced analytics',
        'Priority support',
        'Custom IVR menus',
        'Google Calendar integration',
      ],
    },
    BUSINESS: {
      name: 'Business',
      price: 499,
      features: [
        'Unlimited call minutes',
        'Unlimited SMS messages',
        'Unlimited emails',
        'Unlimited phone numbers',
        'Advanced analytics & reports',
        'Dedicated support',
        'Custom integrations',
        'White-label options',
        'SLA guarantee',
      ],
    },
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Current Plan</h2>
              <p className="text-sm text-muted-foreground">
                {account.status === 'TRIAL'
                  ? `Trial ends ${new Date(account.trialEndsAt!).toLocaleDateString()}`
                  : `Billed monthly`}
              </p>
            </div>
          </div>
          <Badge
            variant={account.status === 'ACTIVE' ? 'success' : 'warning'}
            className="text-lg px-4 py-2"
          >
            {plans[account.plan as keyof typeof plans].name} - $
            {plans[account.plan as keyof typeof plans].price}/mo
          </Badge>
        </div>

        {account.status === 'TRIAL' && (
          <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-orange-900">Trial Active</p>
              <p className="text-sm text-orange-700">
                Your trial ends on{' '}
                {new Date(account.trialEndsAt!).toLocaleDateString()}. Upgrade
                now to continue using all features.
              </p>
            </div>
            <Button variant="default">Upgrade Now</Button>
          </div>
        )}

        {/* Usage meters */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Call Minutes</span>
              <span className="text-sm text-muted-foreground">
                {account.minutesUsed} / {account.minutesLimit} minutes
              </span>
            </div>
            <Progress value={minutesPercentage} className="h-2" />
            {minutesPercentage > 80 && (
              <p className="text-xs text-orange-600 mt-1">
                You've used {minutesPercentage.toFixed(0)}% of your limit
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">SMS Messages</span>
              <span className="text-sm text-muted-foreground">
                {account.smsUsed} / {account.smsLimit} messages
              </span>
            </div>
            <Progress value={smsPercentage} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Emails Sent</span>
              <span className="text-sm text-muted-foreground">
                {account.emailsUsed} / {account.emailsLimit} emails
              </span>
            </div>
            <Progress value={emailsPercentage} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Available plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(plans).map(([key, plan]) => {
            const isCurrentPlan = account.plan === key

            return (
              <Card
                key={key}
                className={`p-6 ${
                  isCurrentPlan ? 'border-primary border-2' : ''
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Badge variant="default" className="w-full justify-center py-2">
                    Current Plan
                  </Badge>
                ) : (
                  <Button className="w-full">
                    {key === 'BUSINESS' ? 'Contact Sales' : 'Upgrade'}
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Usage history */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Usage History</h2>

        {usageRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No usage records yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Minutes</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead>Emails</TableHead>
                <TableHead>Overage Cost</TableHead>
                <TableHead>Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {new Date(record.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{record.minutesUsed}</TableCell>
                  <TableCell>{record.smsUsed}</TableCell>
                  <TableCell>{record.emailsSent}</TableCell>
                  <TableCell>
                    ${(record.overageCost / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${(record.totalCost / 100).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Payment method */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Payment Method</h2>
          <Button variant="outline">Update</Button>
        </div>

        {account.stripeCustomerId ? (
          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <CreditCard className="h-8 w-8 text-gray-400" />
            <div>
              <p className="font-medium">•••• •••• •••• 4242</p>
              <p className="text-sm text-muted-foreground">Expires 12/2025</p>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-dashed rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No payment method on file
            </p>
            <Button>Add Payment Method</Button>
          </div>
        )}
      </Card>

      {/* Invoices */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Invoices</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No invoices yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Placeholder - in production, map over invoices from Stripe */}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
