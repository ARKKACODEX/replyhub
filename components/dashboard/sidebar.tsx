'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Phone,
  Users,
  Calendar,
  MessageSquare,
  Settings,
  BarChart3,
  CreditCard,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Account } from '@prisma/client'

interface DashboardSidebarProps {
  account: Account & {
    _count?: {
      calls: number
      contacts: number
      appointments: number
      messages: number
    }
  }
  className?: string
  isMobile?: boolean
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: Home },
  { name: 'Calls', href: '/dashboard/calls', icon: Phone },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
]

const settingsNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Zap },
]

export function DashboardSidebar({
  account,
  className,
  isMobile = false,
}: DashboardSidebarProps) {
  const pathname = usePathname()

  // Calculate usage percentages
  const minutesPercentage = (account.minutesUsed / account.minutesLimit) * 100
  const smsPercentage = (account.smsUsed / account.smsLimit) * 100

  if (isMobile) {
    // Mobile bottom navigation - show only main items
    return (
      <nav className="border-t bg-white">
        <div className="flex justify-around">
          {navigation.slice(0, 5).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center py-2 px-3 text-xs font-medium',
                  isActive
                    ? 'text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'w-64 border-r bg-white flex flex-col',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Phone className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">ReplyHub</span>
        </Link>
      </div>

      {/* Account status */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{account.businessName}</span>
          <Badge variant={account.status === 'ACTIVE' ? 'success' : 'warning'}>
            {account.plan}
          </Badge>
        </div>

        {account.status === 'TRIAL' && account.trialEndsAt && (
          <p className="text-xs text-gray-500">
            Trial ends {new Date(account.trialEndsAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t">
          {settingsNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Usage meters */}
      <div className="border-t p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">
              Call Minutes
            </span>
            <span className="text-xs text-gray-500">
              {account.minutesUsed} / {account.minutesLimit}
            </span>
          </div>
          <Progress
            value={minutesPercentage}
            className={cn(
              'h-2',
              minutesPercentage > 90 && 'bg-red-100'
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">
              SMS Messages
            </span>
            <span className="text-xs text-gray-500">
              {account.smsUsed} / {account.smsLimit}
            </span>
          </div>
          <Progress
            value={smsPercentage}
            className={cn(
              'h-2',
              smsPercentage > 90 && 'bg-red-100'
            )}
          />
        </div>

        {(minutesPercentage > 90 || smsPercentage > 90) && (
          <Link
            href="/dashboard/billing"
            className="block text-center text-xs text-primary hover:underline"
          >
            Upgrade plan
          </Link>
        )}
      </div>
    </aside>
  )
}
