import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { APIError } from './api-error'

/**
 * Central error handler for all API routes
 * Converts various error types into consistent API responses
 */
export function handleAPIError(error: unknown) {
  console.error('API Error:', error)

  // Known API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode }
    )
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: {
            message: 'A record with this value already exists',
            code: 'DUPLICATE_ERROR',
            details: error.meta,
          },
        },
        { status: 409 }
      )
    }

    // Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: {
            message: 'Record not found',
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      )
    }

    // Foreign key constraint failed
    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid reference to related record',
            code: 'INVALID_REFERENCE',
          },
        },
        { status: 400 }
      )
    }
  }

  // Clerk authentication errors
  if (error instanceof Error && error.message.includes('Clerk')) {
    return NextResponse.json(
      {
        error: {
          message: 'Authentication error',
          code: 'AUTH_ERROR',
        },
      },
      { status: 401 }
    )
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  )
}

/**
 * Async error wrapper for API route handlers
 * Usage: export const GET = asyncHandler(async (req) => { ... })
 */
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<Response>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}
