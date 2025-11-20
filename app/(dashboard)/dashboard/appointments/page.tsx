import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Clock,
  User,
  MapPin,
  Search,
  Filter,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface AppointmentsPageProps {
  searchParams: {
    search?: string
    status?: string
    view?: string
    page?: string
  }
}

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
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
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  // Build filters
  const where: any = { accountId }

  if (searchParams.search) {
    where.OR = [
      {
        contact: {
          OR: [
            {
              firstName: { contains: searchParams.search, mode: 'insensitive' },
            },
            { lastName: { contains: searchParams.search, mode: 'insensitive' } },
            { email: { contains: searchParams.search, mode: 'insensitive' } },
          ],
        },
      },
      { staffNotes: { contains: searchParams.search, mode: 'insensitive' } },
      { customerNotes: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  if (searchParams.status) {
    where.status = searchParams.status
  }

  // Fetch appointments with pagination
  const [appointments, totalAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { contact: true },
      orderBy: { startTime: 'asc' },
      skip: offset,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ])

  const totalPages = Math.ceil(totalAppointments / limit)

  // Get appointment statistics
  const now = new Date()
  const [confirmedCount, pendingCount, completedCount, upcomingCount] =
    await Promise.all([
      prisma.appointment.count({
        where: { accountId, status: 'CONFIRMED' },
      }),
      prisma.appointment.count({
        where: { accountId, status: 'SCHEDULED' },
      }),
      prisma.appointment.count({
        where: { accountId, status: 'COMPLETED' },
      }),
      prisma.appointment.count({
        where: {
          accountId,
          status: 'CONFIRMED',
          startTime: { gte: now },
        },
      }),
    ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage and schedule customer appointments
          </p>
        </div>
        <Button>
          <CalendarPlus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Upcoming
              </p>
              <p className="text-2xl font-bold">{upcomingCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Confirmed
              </p>
              <p className="text-2xl font-bold">{confirmedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pending
              </p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Completed
              </p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by contact name, email, or notes..."
                defaultValue={searchParams.search}
                className="pl-9"
              />
            </div>
          </div>
          <Select defaultValue={searchParams.status || 'all'}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="NO_SHOW">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Appointments table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No appointments found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchParams.search || searchParams.status
                      ? 'Try adjusting your filters'
                      : 'Schedule your first appointment to get started'}
                  </p>
                  <Button>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    New Appointment
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment: any) => {
                const initials = `${appointment.contact?.firstName?.[0] || ''}${
                  appointment.contact?.lastName?.[0] || ''
                }`.toUpperCase()
                const isPast = new Date(appointment.startTime) < now
                const isToday =
                  new Date(appointment.startTime).toDateString() ===
                  now.toDateString()

                return (
                  <TableRow
                    key={appointment.id}
                    className={isToday ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-white">
                            {initials || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {appointment.contact?.firstName}{' '}
                            {appointment.contact?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.contact?.email || appointment.contact?.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(appointment.startTime).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(appointment.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      {isToday && (
                        <Badge variant="default" className="ml-6 mt-1">
                          Today
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {appointment.duration ? `${appointment.duration} min` : '-'}
                    </TableCell>
                    <TableCell>
                      {appointment.googleMeetLink ? (
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Google Meet</span>
                        </div>
                      ) : appointment.location ? (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{appointment.location}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          appointment.status === 'CONFIRMED'
                            ? 'success'
                            : appointment.status === 'SCHEDULED'
                            ? 'warning'
                            : appointment.status === 'COMPLETED'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {appointment.staffNotes || appointment.customerNotes || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {appointment.googleMeetLink && (
                          <a
                            href={appointment.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <Video className="mr-1 h-3 w-3" />
                              Join
                            </Button>
                          </a>
                        )}
                        <Link
                          href={`/dashboard/appointments/${appointment.id}`}
                        >
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1} to{' '}
              {Math.min(offset + limit, totalAppointments)} of{' '}
              {totalAppointments} appointments
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/dashboard/appointments?page=${page - 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.status ? `&status=${searchParams.status}` : ''}`}
              >
                <Button variant="outline" size="sm" disabled={page === 1}>
                  Previous
                </Button>
              </Link>
              <div className="text-sm">
                Page {page} of {totalPages}
              </div>
              <Link
                href={`/dashboard/appointments?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.status ? `&status=${searchParams.status}` : ''}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
