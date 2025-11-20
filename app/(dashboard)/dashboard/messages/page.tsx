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
  MessageSquare,
  Send,
  Search,
  Filter,
  Phone,
  Mail,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import Link from 'next/link'

interface MessagesPageProps {
  searchParams: {
    search?: string
    direction?: string
    page?: string
  }
}

export default async function MessagesPage({
  searchParams,
}: MessagesPageProps) {
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
  const limit = 50
  const offset = (page - 1) * limit

  // Build filters
  const where: any = { accountId }

  if (searchParams.search) {
    where.OR = [
      { from: { contains: searchParams.search } },
      { to: { contains: searchParams.search } },
      { body: { contains: searchParams.search, mode: 'insensitive' } },
      {
        contact: {
          OR: [
            {
              firstName: { contains: searchParams.search, mode: 'insensitive' },
            },
            { lastName: { contains: searchParams.search, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  if (searchParams.direction) {
    where.direction = searchParams.direction
  }

  // Fetch messages with pagination
  const [messages, totalMessages] = await Promise.all([
    prisma.message.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.message.count({ where }),
  ])

  const totalPages = Math.ceil(totalMessages / limit)

  // Get message statistics
  const [inboundCount, outboundCount, todayCount] = await Promise.all([
    prisma.message.count({
      where: { accountId, direction: 'INBOUND' },
    }),
    prisma.message.count({
      where: { accountId, direction: 'OUTBOUND' },
    }),
    prisma.message.count({
      where: {
        accountId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            View and send SMS messages to your contacts
          </p>
        </div>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Received
              </p>
              <p className="text-2xl font-bold">{inboundCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold">{outboundCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{todayCount}</p>
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
                placeholder="Search messages..."
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
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="INBOUND">Received</SelectItem>
              <SelectItem value="OUTBOUND">Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Messages list */}
      <Card className="divide-y">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No messages found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchParams.search || searchParams.direction
                ? 'Try adjusting your filters'
                : 'Send your first message to get started'}
            </p>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </div>
        ) : (
          messages.map((message) => {
            const initials = `${message.contact?.firstName?.[0] || ''}${
              message.contact?.lastName?.[0] || ''
            }`.toUpperCase()

            const isInbound = message.direction === 'INBOUND'

            return (
              <div
                key={message.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <Avatar>
                    <AvatarFallback
                      className={
                        isInbound
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                      }
                    >
                      {initials || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">
                          {message.contact
                            ? `${message.contact.firstName} ${message.contact.lastName}`
                            : message.from}
                        </p>
                        <Badge
                          variant={isInbound ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {isInbound ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3 mr-1" />
                              Received
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              Sent
                            </>
                          )}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {isInbound ? `From: ${message.from}` : `To: ${message.to}`}
                    </p>

                    <p className="text-sm">{message.body}</p>

                    {message.status && message.status !== 'DELIVERED' && (
                      <Badge variant="warning" className="mt-2">
                        {message.status}
                      </Badge>
                    )}
                  </div>

                  {message.contactId && (
                    <Link href={`/dashboard/contacts/${message.contactId}`}>
                      <Button variant="ghost" size="sm">
                        View Contact
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, totalMessages)}{' '}
              of {totalMessages} messages
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/dashboard/messages?page=${page - 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${
                  searchParams.direction
                    ? `&direction=${searchParams.direction}`
                    : ''
                }`}
              >
                <Button variant="outline" size="sm" disabled={page === 1}>
                  Previous
                </Button>
              </Link>
              <div className="text-sm">
                Page {page} of {totalPages}
              </div>
              <Link
                href={`/dashboard/messages?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${
                  searchParams.direction
                    ? `&direction=${searchParams.direction}`
                    : ''
                }`}
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
