import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// User operations
export async function createUser(email: string, authProvider: string) {
  return prisma.user.create({
    data: {
      userId: uuidv4(),
      email,
      authProvider,
      verified: false,
    },
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { userId },
  })
}

export async function updateUserEmail(userId: string, email: string) {
  return prisma.user.update({
    where: { userId },
    data: { email },
  })
}

export async function updateUserAuthProvider(userId: string, authProvider: string) {
  return prisma.user.update({
    where: { userId },
    data: { authProvider },
  })
}

export async function deleteUser(userId: string) {
  // This will cascade delete all entries due to the relation
  return prisma.user.delete({
    where: { userId },
  })
}

// OpenADP metadata operations (two-slot system)
export async function setOpenADPMetadata(userId: string, metadata: string) {
  const user = await getUserById(userId)
  if (!user) throw new Error('User not found')

  // Determine which slot to use (opposite of current)
  const useSlotA = !user.openadpMetadataCurrent

  return prisma.user.update({
    where: { userId },
    data: {
      [useSlotA ? 'openadpMetadataA' : 'openadpMetadataB']: metadata,
      openadpMetadataCurrent: useSlotA,
    },
  })
}

export async function getCurrentOpenADPMetadata(userId: string) {
  const user = await getUserById(userId)
  if (!user) return null

  return user.openadpMetadataCurrent ? user.openadpMetadataA : user.openadpMetadataB
}

// Entry operations
export async function createEntry(
  userId: string,
  name: string,
  hpkeBlob: Buffer,
  deletionHash: Buffer
) {
  return prisma.entry.create({
    data: {
      userId,
      name,
      hpkeBlob,
      deletionHash,
    },
  })
}

export async function getEntriesByUserId(userId: string) {
  return prisma.entry.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })
}

export async function getEntry(userId: string, name: string) {
  return prisma.entry.findUnique({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  })
}

export async function deleteEntry(userId: string, name: string) {
  return prisma.entry.delete({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  })
}

// Stats operations
export async function getUserStats() {
  const totalUsers = await prisma.user.count()
  
  const usersWithVaults = await prisma.user.count({
    where: {
      OR: [
        { openadpMetadataA: { not: null } },
        { openadpMetadataB: { not: null } },
      ],
    },
  })

  // Recent signups - last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentSignups7d = await prisma.user.count({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
  })

  // Recent signups - last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentSignups30d = await prisma.user.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  })

  // Total entries across all users
  const totalEntries = await prisma.entry.count()

  return {
    total_users: totalUsers,
    recent_signups_7d: recentSignups7d,
    recent_signups_30d: recentSignups30d,
    users_with_vaults: usersWithVaults,
    total_entries: totalEntries,
  }
} 