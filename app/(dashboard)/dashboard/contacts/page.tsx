import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'

interface ContactsPageProps {
  searchParams: {
    search?: string
    page?: string
  }
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
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
  const where: any = { accountId, deletedAt: null }

  if (searchParams.search) {
    where.OR = [
      { firstName: { contains: searchParams.search, mode: 'insensitive' } },
      { lastName: { contains: searchParams.search, mode: 'insensitive' } },
      { email: { contains: searchParams.search, mode: 'insensitive' } },
      { phone: { contains: searchParams.search } },
      { company: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  // Fetch contacts with pagination
  const [contacts, totalContacts] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        _count: {
          select: {
            calls: true,
            appointments: true,
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  const totalPages = Math.ceil(totalContacts / limit)

  // Get contact statistics
  const [totalActive, newThisMonth] = await Promise.all([
    prisma.contact.count({
      where: { accountId, deletedAt: null },
    }),
    prisma.contact.count({
      where: {
        accountId,
        deletedAt: null,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Contacts
              </p>
              <p className="text-2xl font-bold">{totalActive}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                New This Month
              </p>
              <p className="text-2xl font-bold">{newThisMonth}</p>
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
                Avg Interactions
              </p>
              <p className="text-2xl font-bold">
                {contacts.length > 0
                  ? Math.round(
                      contacts.reduce(
                        (sum, c) =>
                          sum + c._count.calls + c._count.messages + c._count.appointments,
                        0
                      ) / contacts.length
                    )
                  : 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search contacts by name, email, phone, or company..."
            defaultValue={searchParams.search}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Contacts table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No contacts found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchParams.search
                      ? 'Try adjusting your search'
                      : 'Get started by adding your first contact'}
                  </p>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const initials = `${contact.firstName?.[0] || ''}${
                  contact.lastName?.[0] || ''
                }`.toUpperCase()

                return (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-white">
                            {initials || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {contact.timezone || 'No timezone'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm">{contact.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.company || (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{contact._count.calls}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-3 w-3 text-gray-400" />
                          <span>{contact._count.messages}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{contact._count.appointments}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {(contact.tags as string[]).slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                          {(contact.tags as string[]).length > 2 && (
                            <Badge variant="outline">
                              +{(contact.tags as string[]).length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/dashboard/contacts/${contact.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
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
              Showing {offset + 1} to {Math.min(offset + limit, totalContacts)}{' '}
              of {totalContacts} contacts
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/dashboard/contacts?page=${page - 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
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
                href={`/dashboard/contacts?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
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
