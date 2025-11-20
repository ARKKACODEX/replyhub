import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Play,
  Download,
  Filter,
  Search,
} from 'lucide-react'
import Link from 'next/link'

interface CallsPageProps {
  searchParams: {
    search?: string
    direction?: string
    status?: string
    page?: string
  }
}

export default async function CallsPage({ searchParams }: CallsPageProps) {
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
      { from: { contains: searchParams.search } },
      { to: { contains: searchParams.search } },
      {
        contact: {
          OR: [
            { firstName: { contains: searchParams.search, mode: 'insensitive' } },
            { lastName: { contains: searchParams.search, mode: 'insensitive' } },
            { phone: { contains: searchParams.search } },
          ],
        },
      },
    ]
  }

  if (searchParams.direction) {
    where.direction = searchParams.direction
  }

  if (searchParams.status) {
    where.status = searchParams.status
  }

  // Fetch calls with pagination
  const [calls, totalCalls] = await Promise.all([
    prisma.call.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.call.count({ where }),
  ])

  const totalPages = Math.ceil(totalCalls / limit)

  // Get call statistics
  const [inboundCount, outboundCount, missedCount, avgDuration] = await Promise.all([
    prisma.call.count({
      where: { ...where, direction: 'INBOUND' },
    }),
    prisma.call.count({
      where: { ...where, direction: 'OUTBOUND' },
    }),
    prisma.call.count({
      where: { ...where, status: 'NO_ANSWER' },
    }),
    prisma.call.aggregate({
      where: { ...where, duration: { not: null } },
      _avg: { duration: true },
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
          <p className="text-muted-foreground">
            Manage and review all your call history
          </p>
        </div>
        <Button>
          <Phone className="mr-2 h-4 w-4" />
          Make Call
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <PhoneIncoming className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inbound
              </p>
              <p className="text-2xl font-bold">{inboundCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <PhoneOutgoing className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Outbound
              </p>
              <p className="text-2xl font-bold">{outboundCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <PhoneMissed className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Missed
              </p>
              <p className="text-2xl font-bold">{missedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg Duration
              </p>
              <p className="text-2xl font-bold">
                {avgDuration._avg.duration
                  ? `${Math.floor(avgDuration._avg.duration / 60)}m`
                  : '-'}
              </p>
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
                placeholder="Search by contact name, phone number..."
                defaultValue={searchParams.search}
                className="pl-9"
              />
            </div>
          </div>
          <Select defaultValue={searchParams.direction || 'all'}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="INBOUND">Inbound</SelectItem>
              <SelectItem value="OUTBOUND">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue={searchParams.status || 'all'}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="NO_ANSWER">No Answer</SelectItem>
              <SelectItem value="BUSY">Busy</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Calls table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No calls found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchParams.search || searchParams.direction || searchParams.status
                      ? 'Try adjusting your filters'
                      : 'Start making calls to see them here'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          call.direction === 'INBOUND'
                            ? 'bg-blue-100'
                            : 'bg-green-100'
                        }`}
                      >
                        {call.direction === 'INBOUND' ? (
                          <PhoneIncoming
                            className={`h-4 w-4 ${
                              call.direction === 'INBOUND'
                                ? 'text-blue-600'
                                : 'text-green-600'
                            }`}
                          />
                        ) : (
                          <PhoneOutgoing
                            className={`h-4 w-4 ${
                              call.direction === 'INBOUND'
                                ? 'text-blue-600'
                                : 'text-green-600'
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {call.contact
                            ? `${call.contact.firstName} ${call.contact.lastName}`
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{call.from}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {call.direction === 'INBOUND' ? 'Inbound' : 'Outbound'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        call.status === 'COMPLETED'
                          ? 'success'
                          : call.status === 'NO_ANSWER'
                          ? 'warning'
                          : call.status === 'FAILED'
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {call.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {call.duration
                      ? `${Math.floor(call.duration / 60)}:${String(
                          call.duration % 60
                        ).padStart(2, '0')}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{new Date(call.createdAt).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">
                        {new Date(call.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {call.recordingUrl && (
                        <>
                          <Button variant="ghost" size="icon">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Link href={`/dashboard/contacts/${call.contactId}`}>
                        <Button variant="ghost" size="sm">
                          View Contact
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, totalCalls)} of{' '}
              {totalCalls} calls
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/dashboard/calls?page=${page - 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${
                  searchParams.direction
                    ? `&direction=${searchParams.direction}`
                    : ''
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
                href={`/dashboard/calls?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${
                  searchParams.direction
                    ? `&direction=${searchParams.direction}`
                    : ''
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
