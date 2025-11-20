import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { Toaster } from '@/components/ui/toaster'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Get user's account with related data
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: {
      account: {
        include: {
          _count: {
            select: {
              calls: true,
              contacts: true,
              appointments: true,
              messages: true,
            },
          },
        },
      },
    },
  })

  if (!dbUser || !dbUser.account) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <DashboardSidebar account={dbUser.account} className="hidden lg:block" />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={user} account={dbUser.account} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <DashboardSidebar account={dbUser.account} isMobile />
      </div>

      <Toaster />
    </div>
  )
}
