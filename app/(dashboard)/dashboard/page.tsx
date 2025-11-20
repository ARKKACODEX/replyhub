import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Phone,
  Calendar,
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
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

  const accountId = dbUser.account.id

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get this month's date range
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  // Fetch analytics data
  const [
    totalCalls,
    totalContacts,
    totalAppointments,
    totalMessages,
    todayCalls,
    thisMonthCalls,
    recentCalls,
    recentAppointments,
    callsByStatus,
  ] = await Promise.all([
    prisma.call.count({ where: { accountId } }),
    prisma.contact.count({ where: { accountId, deletedAt: null } }),
    prisma.appointment.count({ where: { accountId, deletedAt: null } }),
    prisma.message.count({ where: { accountId } }),
    prisma.call.count({
      where: { accountId, createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.call.count({
      where: { accountId, createdAt: { gte: thisMonth, lt: nextMonth } },
    }),
    prisma.call.findMany({
      where: { accountId },
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: { accountId, deletedAt: null },
      include: { contact: true },
      orderBy: { startTime: 'asc' },
      take: 5,
    }),
    prisma.call.groupBy({
      by: ['status'],
      where: { accountId },
      _count: true,
    }),
  ])

  // Calculate metrics
  const inboundCalls = await prisma.call.count({
    where: { accountId, direction: 'INBOUND' },
  })
  const outboundCalls = await prisma.call.count({
    where: { accountId, direction: 'OUTBOUND' },
  })
  const missedCalls = callsByStatus.find((s) => s.status === 'NO_ANSWER')?._count || 0

  const minutesPercentage = (dbUser.account.minutesUsed / dbUser.account.minutesLimit) * 100
  const smsPercentage = (dbUser.account.smsUsed / dbUser.account.smsLimit) * 100

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName || 'there'}! Here's what's happening today.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Calls
              </p>
              <p className="text-2xl font-bold">{totalCalls}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {todayCalls} today
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Contacts
              </p>
              <p className="text-2xl font-bold">{totalContacts}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Active contacts
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Appointments
              </p>
              <p className="text-2xl font-bold">{totalAppointments}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Messages
              </p>
              <p className="text-2xl font-bold">{totalMessages}</p>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Usage and call breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Usage meters */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Call Minutes</span>
                <span className="text-sm text-muted-foreground">
                  {dbUser.account.minutesUsed} / {dbUser.account.minutesLimit} min
                </span>
              </div>
              <Progress value={minutesPercentage} className="h-2" />
              {minutesPercentage > 80 && (
                <p className="text-xs text-orange-600 mt-1">
                  You're using {minutesPercentage.toFixed(0)}% of your limit
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SMS Messages</span>
                <span className="text-sm text-muted-foreground">
                  {dbUser.account.smsUsed} / {dbUser.account.smsLimit} messages
                </span>
              </div>
              <Progress value={smsPercentage} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Emails Sent</span>
                <span className="text-sm text-muted-foreground">
                  {dbUser.account.emailsUsed} / {dbUser.account.emailsLimit} emails
                </span>
              </div>
              <Progress
                value={(dbUser.account.emailsUsed / dbUser.account.emailsLimit) * 100}
                className="h-2"
              />
            </div>

            <Link href="/dashboard/billing">
              <Button variant="outline" className="w-full mt-2">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </Card>

        {/* Call breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Call Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <PhoneIncoming className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Inbound Calls</p>
                  <p className="text-xs text-muted-foreground">Received</p>
                </div>
              </div>
              <p className="text-xl font-bold">{inboundCalls}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <PhoneOutgoing className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Outbound Calls</p>
                  <p className="text-xs text-muted-foreground">Made</p>
                </div>
              </div>
              <p className="text-xl font-bold">{outboundCalls}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <PhoneMissed className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Missed Calls</p>
                  <p className="text-xs text-muted-foreground">No answer</p>
                </div>
              </div>
              <p className="text-xl font-bold">{missedCalls}</p>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Month</span>
                <span className="text-xl font-bold">{thisMonthCalls}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total calls in {new Date().toLocaleDateString('en-US', { month: 'long' })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent calls */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Calls</h3>
            <Link href="/dashboard/calls">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No calls yet. Start making calls to see them here.
              </p>
            ) : (
              recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        call.direction === 'INBOUND'
                          ? 'bg-blue-100'
                          : 'bg-green-100'
                      }`}
                    >
                      {call.direction === 'INBOUND' ? (
                        <PhoneIncoming className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.contact?.firstName} {call.contact?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {call.from}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        call.status === 'COMPLETED'
                          ? 'success'
                          : call.status === 'NO_ANSWER'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {call.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '-'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming appointments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Appointments</h3>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming appointments. Schedule one to get started.
              </p>
            ) : (
              recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {appointment.contact?.firstName}{' '}
                        {appointment.contact?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appointment.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      appointment.status === 'CONFIRMED'
                        ? 'success'
                        : appointment.status === 'SCHEDULED'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {appointment.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Link href="/dashboard/calls">
            <Button variant="outline" className="w-full justify-start">
              <Phone className="mr-2 h-4 w-4" />
              Make a Call
            </Button>
          </Link>
          <Link href="/dashboard/contacts">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
          <Link href="/dashboard/appointments">
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Appointment
            </Button>
          </Link>
          <Link href="/dashboard/messages">
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
