import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Zap,
  Phone,
  Calendar,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
} from 'lucide-react'

export default async function IntegrationsPage() {
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

  // Check integration status
  const integrations = [
    {
      name: 'Twilio',
      description: 'VoIP calls, SMS messaging, and phone numbers',
      icon: Phone,
      connected: !!account.twilioPhoneNumber,
      status: account.twilioPhoneNumber
        ? `Phone: ${account.twilioPhoneNumber}`
        : 'Not configured',
      category: 'Communication',
      connectUrl: '/dashboard/settings',
    },
    {
      name: 'Google Calendar',
      description: 'Sync appointments and create Google Meet links',
      icon: Calendar,
      connected: !!account.googleTokens,
      status: account.googleTokens ? 'Connected' : 'Not connected',
      category: 'Productivity',
      connectUrl: '/api/integrations/google/authorize',
    },
    {
      name: 'SendGrid',
      description: 'Send transactional emails and notifications',
      icon: Mail,
      connected: !!process.env.SENDGRID_API_KEY,
      status: process.env.SENDGRID_API_KEY ? 'Active' : 'Not configured',
      category: 'Communication',
      connectUrl: '/dashboard/settings',
    },
    {
      name: 'OpenAI',
      description: 'AI-powered chatbot and conversation assistance',
      icon: MessageSquare,
      connected: !!process.env.OPENAI_API_KEY,
      status: process.env.OPENAI_API_KEY ? 'Active' : 'Not configured',
      category: 'AI',
      connectUrl: '/dashboard/settings',
    },
    {
      name: 'Stripe',
      description: 'Payment processing and subscription management',
      icon: Zap,
      connected: !!account.stripeCustomerId,
      status: account.stripeCustomerId
        ? `Customer ID: ${account.stripeCustomerId.substring(0, 12)}...`
        : 'Not connected',
      category: 'Billing',
      connectUrl: '/dashboard/billing',
    },
  ]

  const categories = [...new Set(integrations.map((i) => i.category))]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite tools and services
        </p>
      </div>

      {/* Integration categories */}
      {categories.map((category) => {
        const categoryIntegrations = integrations.filter(
          (i) => i.category === category
        )

        return (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryIntegrations.map((integration) => (
                <Card key={integration.name} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div
                        className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                          integration.connected
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <integration.icon
                          className={`h-6 w-6 ${
                            integration.connected
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{integration.name}</h3>
                          <Badge
                            variant={
                              integration.connected ? 'success' : 'outline'
                            }
                          >
                            {integration.connected ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Connected</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>Not connected</span>
                              </div>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {integration.connected && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Status
                      </p>
                      <p className="text-sm font-mono">{integration.status}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    {integration.connected ? (
                      <>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </Button>
                        <Button variant="outline" size="sm">
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="flex-1">
                        Connect
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {/* Webhooks */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Webhooks</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure webhooks to receive real-time events from ReplyHub
        </p>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">Webhook URL</p>
                <p className="text-sm text-muted-foreground">
                  Receive events for calls, messages, and appointments
                </p>
              </div>
              <Badge variant="outline">Inactive</Badge>
            </div>
            <div className="mt-4">
              <input
                type="url"
                placeholder="https://your-app.com/webhook"
                className="w-full p-2 border rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <p className="font-medium mb-2">Available Events</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'call.created',
                'call.completed',
                'message.received',
                'appointment.created',
                'appointment.updated',
                'contact.created',
              ].map((event) => (
                <label key={event} className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm font-mono">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline">Test Webhook</Button>
            <Button>Save Webhook</Button>
          </div>
        </div>
      </Card>

      {/* API Keys */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">API Keys</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Use API keys to integrate ReplyHub with your custom applications
        </p>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">Production API Key</p>
                <p className="text-sm text-muted-foreground">
                  Use this key for production environments
                </p>
              </div>
              <Button variant="outline" size="sm">
                Regenerate
              </Button>
            </div>
            <div className="mt-4 p-2 bg-gray-50 rounded border font-mono text-sm">
              rh_live_••••••••••••••••••••••••••••4Ke8
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">Test API Key</p>
                <p className="text-sm text-muted-foreground">
                  Use this key for development and testing
                </p>
              </div>
              <Button variant="outline" size="sm">
                Regenerate
              </Button>
            </div>
            <div className="mt-4 p-2 bg-gray-50 rounded border font-mono text-sm">
              rh_test_••••••••••••••••••••••••••••8Xa2
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 border border-orange-200 bg-orange-50 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-900">
              Keep your API keys secure
            </p>
            <p className="text-sm text-orange-700">
              Never share your API keys or commit them to version control. Treat
              them like passwords.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
