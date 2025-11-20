/**
 * Google Calendar Client Library
 * Handles OAuth and calendar event management
 */

import { google } from 'googleapis'
import { prisma } from './db'

/**
 * Create OAuth2 client
 */
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
  )
}

/**
 * Get authorization URL
 */
export function getAuthUrl(accountId: string) {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: accountId,
    prompt: 'consent',
  })
}

/**
 * Exchange code for tokens
 */
export async function getTokensFromCode(code: string) {
  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    throw new Error('Failed to exchange code for tokens')
  }
}

/**
 * Get calendar client with stored tokens
 */
export async function getCalendarClient(accountId: string) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      throw new Error('Account not found')
    }

    const tokens = account.googleTokens as {
      access_token: string
      refresh_token: string
      expiry_date: number
    } | null

    if (!tokens) {
      throw new Error('Google Calendar not connected')
    }

    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials(tokens)

    // Refresh token if expired
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Update stored tokens
      await prisma.account.update({
        where: { id: accountId },
        data: {
          googleTokens: credentials as any,
        },
      })

      oauth2Client.setCredentials(credentials)
    }

    return google.calendar({ version: 'v3', auth: oauth2Client })
  } catch (error) {
    console.error('Error getting calendar client:', error)
    throw error
  }
}

/**
 * Create calendar event
 */
export async function createCalendarEvent(params: {
  accountId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  attendeeEmail?: string
  location?: string
  timezone?: string
}) {
  try {
    const calendar = await getCalendarClient(params.accountId)

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: params.timezone || 'America/New_York',
        },
        end: {
          dateTime: params.endTime.toISOString(),
          timeZone: params.timezone || 'America/New_York',
        },
        attendees: params.attendeeEmail
          ? [{ email: params.attendeeEmail }]
          : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
        conferenceData: {
          createRequest: {
            requestId: `${params.accountId}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    return {
      id: event.data.id!,
      htmlLink: event.data.htmlLink!,
      hangoutLink: event.data.hangoutLink,
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw new Error('Failed to create calendar event')
  }
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(params: {
  accountId: string
  eventId: string
  title?: string
  description?: string
  startTime?: Date
  endTime?: Date
  timezone?: string
}) {
  try {
    const calendar = await getCalendarClient(params.accountId)

    const event = await calendar.events.update({
      calendarId: 'primary',
      eventId: params.eventId,
      requestBody: {
        summary: params.title,
        description: params.description,
        start: params.startTime
          ? {
              dateTime: params.startTime.toISOString(),
              timeZone: params.timezone || 'America/New_York',
            }
          : undefined,
        end: params.endTime
          ? {
              dateTime: params.endTime.toISOString(),
              timeZone: params.timezone || 'America/New_York',
            }
          : undefined,
      },
    })

    return event.data
  } catch (error) {
    console.error('Error updating calendar event:', error)
    throw new Error('Failed to update calendar event')
  }
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(accountId: string, eventId: string) {
  try {
    const calendar = await getCalendarClient(accountId)

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })

    return true
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw new Error('Failed to delete calendar event')
  }
}

/**
 * List calendar events
 */
export async function listCalendarEvents(params: {
  accountId: string
  startDate: Date
  endDate: Date
}) {
  try {
    const calendar = await getCalendarClient(params.accountId)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: params.startDate.toISOString(),
      timeMax: params.endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error listing calendar events:', error)
    throw new Error('Failed to list calendar events')
  }
}

/**
 * Check availability (free/busy)
 */
export async function checkAvailability(params: {
  accountId: string
  startDate: Date
  endDate: Date
}) {
  try {
    const calendar = await getCalendarClient(params.accountId)

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.startDate.toISOString(),
        timeMax: params.endDate.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    const busy = response.data.calendars?.primary?.busy || []
    return busy
  } catch (error) {
    console.error('Error checking availability:', error)
    throw new Error('Failed to check availability')
  }
}
