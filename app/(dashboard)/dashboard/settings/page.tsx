import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Phone,
  Clock,
  Globe,
  Save,
  AlertCircle,
} from 'lucide-react'

export default async function SettingsPage() {
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
  const businessHours = (account.businessHours as any) || {}

  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your business information and preferences
        </p>
      </div>

      {/* Business Information */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Business Information</h2>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                defaultValue={account.businessName}
                placeholder="Enter business name"
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select defaultValue={account.industry || ''}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="professional-services">
                    Professional Services
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                defaultValue={account.website || ''}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue={account.timezone || 'America/New_York'}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">
                    Eastern (ET)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central (CT)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain (MT)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific (PT)
                  </SelectItem>
                  <SelectItem value="America/Phoenix">
                    Arizona (MST)
                  </SelectItem>
                  <SelectItem value="America/Anchorage">
                    Alaska (AKT)
                  </SelectItem>
                  <SelectItem value="Pacific/Honolulu">
                    Hawaii (HST)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              defaultValue={account.address || ''}
              placeholder="123 Main St, City, State ZIP"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Phone Number */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Phone Number</h2>
        </div>

        <div className="space-y-4">
          {account.twilioPhoneNumber ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Current Number</p>
                <p className="text-2xl font-mono">
                  {account.twilioPhoneNumber}
                </p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-orange-900">
                  No phone number configured
                </p>
                <p className="text-sm text-orange-700">
                  You need a phone number to receive calls and send SMS
                </p>
              </div>
              <Button>Get Number</Button>
            </div>
          )}

          <div>
            <Label>Greeting Message</Label>
            <p className="text-sm text-muted-foreground mb-2">
              This message will be played when someone calls your business
            </p>
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md"
              defaultValue={account.greetingMessage || ''}
              placeholder="Thank you for calling. Please hold while we connect you..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Business Hours */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Business Hours</h2>
        </div>

        <div className="space-y-3">
          {daysOfWeek.map((day) => {
            const hours = businessHours[day] || {
              closed: true,
              open: '09:00',
              close: '17:00',
            }

            return (
              <div
                key={day}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="w-28">
                  <p className="font-medium capitalize">{day}</p>
                </div>

                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${day}-closed`}
                      defaultChecked={!hours.closed}
                      className="rounded"
                    />
                    <Label htmlFor={`${day}-closed`} className="cursor-pointer">
                      Open
                    </Label>
                  </div>

                  {!hours.closed && (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          defaultValue={hours.open}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          defaultValue={hours.close}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Hours
          </Button>
        </div>
      </Card>

      {/* Language & Localization */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Language & Localization</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="language">Primary Language</Label>
            <Select defaultValue={account.language || 'en'}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select defaultValue="USD">
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  )
}
