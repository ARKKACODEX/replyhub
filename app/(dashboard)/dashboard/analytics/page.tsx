import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Phone,
  MessageSquare,
  Calendar,
  Users,
  Clock,
  DollarSign,
} from 'lucide-react'

interface AnalyticsPageProps {
  searchParams: {
    period?: string
  }
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
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
  const period = searchParams.period || '30d'

  // Calculate date ranges
  const now = new Date()
  const startDate = new Date()

  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(startDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(startDate.getDate() - 90)
      break
    default:
      startDate.setDate(startDate.getDate() - 30)
  }

  // Fetch analytics data
  const [
    totalCalls,
    totalMessages,
    totalAppointments,
    totalContacts,
    callsByDay,
    callsByStatus,
    messagesByDay,
    appointmentsByStatus,
    topContacts,
    avgCallDuration,
    missedCallsCount,
  ] = await Promise.all([
    // Total counts
    prisma.call.count({
      where: { accountId, createdAt: { gte: startDate } },
    }),
    prisma.message.count({
      where: { accountId, createdAt: { gte: startDate } },
    }),
    prisma.appointment.count({
      where: { accountId, createdAt: { gte: startDate }, deletedAt: null },
    }),
    prisma.contact.count({
      where: { accountId, deletedAt: null },
    }),

    // Calls by day (simplified - in production use SQL grouping)
    prisma.call.findMany({
      where: { accountId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),

    // Calls by status
    prisma.call.groupBy({
      by: ['status'],
      where: { accountId, createdAt: { gte: startDate } },
      _count: true,
    }),

    // Messages by day
    prisma.message.findMany({
      where: { accountId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),

    // Appointments by status
    prisma.appointment.groupBy({
      by: ['status'],
      where: { accountId, createdAt: { gte: startDate }, deletedAt: null },
      _count: true,
    }),

    // Top contacts by interaction count
    prisma.contact.findMany({
      where: { accountId, deletedAt: null },
      include: {
        _count: {
          select: {
            calls: true,
            messages: true,
            appointments: true,
          },
        },
      },
      orderBy: {
        calls: {
          _count: 'desc',
        },
      },
      take: 5,
    }),

    // Average call duration
    prisma.call.aggregate({
      where: {
        accountId,
        createdAt: { gte: startDate },
        duration: { not: null },
      },
      _avg: { duration: true },
    }),

    // Missed calls
    prisma.call.count({
      where: {
        accountId,
        createdAt: { gte: startDate },
        status: 'NO_ANSWER',
      },
    }),
  ])

  // Calculate previous period for comparison
  const prevStartDate = new Date(startDate)
  const prevEndDate = new Date(startDate)

  switch (period) {
    case '7d':
      prevStartDate.setDate(prevStartDate.getDate() - 7)
      break
    case '30d':
      prevStartDate.setDate(prevStartDate.getDate() - 30)
      break
    case '90d':
      prevStartDate.setDate(prevStartDate.getDate() - 90)
      break
  }

  const [prevCalls, prevMessages, prevAppointments] = await Promise.all([
    prisma.call.count({
      where: {
        accountId,
        createdAt: { gte: prevStartDate, lt: prevEndDate },
      },
    }),
    prisma.message.count({
      where: {
        accountId,
        createdAt: { gte: prevStartDate, lt: prevEndDate },
      },
    }),
    prisma.appointment.count({
      where: {
        accountId,
        createdAt: { gte: prevStartDate, lt: prevEndDate },
        deletedAt: null,
      },
    }),
  ])

  // Calculate percentage changes
  const callsChange =
    prevCalls > 0 ? ((totalCalls - prevCalls) / prevCalls) * 100 : 0
  const messagesChange =
    prevMessages > 0 ? ((totalMessages - prevMessages) / prevMessages) * 100 : 0
  const appointmentsChange =
    prevAppointments > 0
      ? ((totalAppointments - prevAppointments) / prevAppointments) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your business performance and trends
          </p>
        </div>
        <Select defaultValue={period}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key metrics with trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <Badge
              variant={callsChange >= 0 ? 'success' : 'destructive'}
              className="flex items-center space-x-1"
            >
              {callsChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(callsChange).toFixed(1)}%</span>
            </Badge>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Total Calls
          </p>
          <p className="text-3xl font-bold">{totalCalls}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {callsChange >= 0 ? '+' : ''}
            {(totalCalls - prevCalls).toLocaleString()} vs previous period
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <Badge
              variant={messagesChange >= 0 ? 'success' : 'destructive'}
              className="flex items-center space-x-1"
            >
              {messagesChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(messagesChange).toFixed(1)}%</span>
            </Badge>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Messages</p>
          <p className="text-3xl font-bold">{totalMessages}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {messagesChange >= 0 ? '+' : ''}
            {(totalMessages - prevMessages).toLocaleString()} vs previous period
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <Badge
              variant={appointmentsChange >= 0 ? 'success' : 'destructive'}
              className="flex items-center space-x-1"
            >
              {appointmentsChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(appointmentsChange).toFixed(1)}%</span>
            </Badge>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Appointments
          </p>
          <p className="text-3xl font-bold">{totalAppointments}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {appointmentsChange >= 0 ? '+' : ''}
            {(totalAppointments - prevAppointments).toLocaleString()} vs
            previous period
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Total Contacts
          </p>
          <p className="text-3xl font-bold">{totalContacts}</p>
          <p className="text-xs text-muted-foreground mt-1">Active contacts</p>
        </Card>
      </div>

      {/* Call performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Phone className="mr-2 h-5 w-5 text-primary" />
            Call Performance
          </h3>
          <div className="space-y-4">
            {callsByStatus.map((stat) => {
              const percentage = (stat._count / totalCalls) * 100
              return (
                <div key={stat.status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {stat.status.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {stat._count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stat.status === 'COMPLETED'
                          ? 'bg-green-500'
                          : stat.status === 'NO_ANSWER'
                          ? 'bg-orange-500'
                          : stat.status === 'FAILED'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Call Duration</span>
                <span className="text-sm">
                  {avgCallDuration._avg.duration
                    ? `${Math.floor(avgCallDuration._avg.duration / 60)}m ${
                        avgCallDuration._avg.duration % 60
                      }s`
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Missed Calls</span>
                <Badge variant="warning">{missedCallsCount}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            Appointment Status
          </h3>
          <div className="space-y-4">
            {appointmentsByStatus.map((stat) => {
              const percentage = (stat._count / totalAppointments) * 100
              return (
                <div key={stat.status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {stat.status.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {stat._count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stat.status === 'CONFIRMED'
                          ? 'bg-green-500'
                          : stat.status === 'SCHEDULED'
                          ? 'bg-yellow-500'
                          : stat.status === 'COMPLETED'
                          ? 'bg-blue-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Top contacts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="mr-2 h-5 w-5 text-primary" />
          Most Active Contacts
        </h3>
        <div className="space-y-3">
          {topContacts.map((contact, index) => {
            const totalInteractions =
              contact._count.calls +
              contact._count.messages +
              contact._count.appointments

            return (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{totalInteractions}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact._count.calls}C · {contact._count.messages}M ·{' '}
                    {contact._count.appointments}A
                  </p>
                </div>
              </div>
            )
          })}

          {topContacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No contact activity yet
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
