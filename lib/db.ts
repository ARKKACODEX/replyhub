import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Export types for easy use
export type {
  User,
  Account,
  Contact,
  Call,
  Appointment,
  Message,
  Activity,
  LandingPage,
  KnowledgeBase,
  UsageRecord,
  PlanType,
  AccountStatus,
  ContactSource,
  ContactStatus,
  CallDirection,
  CallStatus,
  LocationType,
  AppointmentStatus,
  MessageType,
  MessageDirection,
  MessageStatus,
  ActivityType,
} from '@prisma/client'
