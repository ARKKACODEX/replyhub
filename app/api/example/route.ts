import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ValidationError, UnauthorizedError } from '@/lib/api-error'
import { handleAPIError } from '@/lib/error-handler'
import { prisma } from '@/lib/db'

/**
 * Example API route demonstrating best practices:
 * - Input validation with Zod
 * - Error handling with custom errors
 * - Type-safe database queries with Prisma
 * - Edge runtime for performance
 *
 * This route is for demonstration purposes only.
 * Delete or modify as needed.
 */

// Request body validation schema
const exampleSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json()
    const data = exampleSchema.parse(body)

    // 2. Check authentication (example - use Clerk in production)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header')
    }

    // 3. Business logic (example)
    // In a real route, you would:
    // - Get user from Clerk
    // - Check permissions
    // - Perform database operations
    // - Call external APIs with retry logic

    // Example database query (commented out since tables may not exist yet)
    // const result = await prisma.contact.create({
    //   data: {
    //     firstName: data.name,
    //     email: data.email,
    //     accountId: 'xxx',
    //   },
    // })

    // 4. Return success response
    return NextResponse.json({
      success: true,
      message: 'Request processed successfully',
      data: {
        name: data.name,
        email: data.email,
        processedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    // Central error handler converts all errors to consistent format
    return handleAPIError(error)
  }
}

// GET method example
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Missing id parameter')
    }

    // Example: Fetch data from database
    // const data = await prisma.contact.findUnique({
    //   where: { id },
    // })

    return NextResponse.json({
      success: true,
      data: {
        id,
        message: 'This is an example response',
      },
    })

  } catch (error) {
    return handleAPIError(error)
  }
}

// Use Edge Runtime for better performance and global distribution
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
