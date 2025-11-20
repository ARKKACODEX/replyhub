'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const STEPS = [
  {
    id: 1,
    title: 'Business Information',
    description: 'Tell us about your business',
    icon: Building2,
  },
  {
    id: 2,
    title: 'Phone Setup',
    description: 'Get your business phone number',
    icon: Phone,
  },
  {
    id: 3,
    title: 'Calendar Integration',
    description: 'Connect Google Calendar (optional)',
    icon: Calendar,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    timezone: 'America/New_York',
    website: '',
    areaCode: '',
    skipCalendar: false,
  })

  const progress = (currentStep / STEPS.length) * 100

  const handleNext = async () => {
    setLoading(true)

    try {
      if (currentStep === 1) {
        // Validate business info
        if (!formData.businessName || !formData.industry) {
          toast({
            title: 'Missing information',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        // Update account with business info
        const response = await fetch('/api/onboarding/business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: formData.businessName,
            industry: formData.industry,
            timezone: formData.timezone,
            website: formData.website,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save business information')
        }

        setCurrentStep(2)
      } else if (currentStep === 2) {
        // Provision phone number
        const response = await fetch('/api/onboarding/phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            areaCode: formData.areaCode || undefined,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to provision phone number')
        }

        const data = await response.json()
        toast({
          title: 'Phone number activated!',
          description: `Your new number is ${data.phoneNumber}`,
        })

        setCurrentStep(3)
      } else if (currentStep === 3) {
        // Complete onboarding
        if (formData.skipCalendar) {
          router.push('/dashboard')
        } else {
          // Redirect to Google OAuth
          window.location.href = '/api/integrations/google/authorize?redirect=/dashboard'
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (currentStep === 3) {
      setFormData({ ...formData, skipCalendar: true })
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Welcome to ReplyHub!</h1>
            <Badge variant="outline">
              Step {currentStep} of {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <div key={step.id} className="flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center mb-2 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>
                  <p
                    className={`text-sm font-medium text-center ${
                      isActive ? 'text-primary' : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-1 w-full mt-6 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <Card className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Tell us about your business
                </h2>
                <p className="text-muted-foreground">
                  This helps us personalize ReplyHub for your needs
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    placeholder="Enter your business name"
                  />
                </div>

                <div>
                  <Label htmlFor="industry">
                    Industry <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      setFormData({ ...formData, industry: value })
                    }
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select your industry" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) =>
                        setFormData({ ...formData, timezone: value })
                      }
                    >
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Get your business phone number
                </h2>
                <p className="text-muted-foreground">
                  We'll provision a dedicated phone number for your business
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="areaCode">Preferred Area Code (optional)</Label>
                  <Input
                    id="areaCode"
                    value={formData.areaCode}
                    onChange={(e) =>
                      setFormData({ ...formData, areaCode: e.target.value })
                    }
                    placeholder="e.g., 212, 415, 310"
                    maxLength={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Leave blank for any available number
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-medium mb-2">What you'll get:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                      Dedicated US phone number
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                      Receive unlimited inbound calls
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                      Send & receive SMS messages
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                      AI-powered call answering
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Connect Google Calendar
                </h2>
                <p className="text-muted-foreground">
                  Automatically create calendar events for appointments
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-medium mb-2">Benefits:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                    Auto-create Google Meet links for appointments
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                    Sync appointments to your calendar
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                    Send calendar invites to customers
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                    Avoid double-booking
                  </li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                You can skip this step and connect later from Settings
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center space-x-2">
              {currentStep === 3 && (
                <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                  Skip for now
                </Button>
              )}
              <Button onClick={handleNext} disabled={loading}>
                {loading
                  ? 'Processing...'
                  : currentStep === 3
                  ? 'Connect Calendar'
                  : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
