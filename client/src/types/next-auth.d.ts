import NextAuth from 'next-auth'
import { User } from '../../../../shared/types/api'

declare module 'next-auth' {
  interface Session {
    serverToken?: string
    serverUser?: User
  }

  interface Account {
    serverToken?: string
    serverUser?: User
  }

  interface JWT {
    serverToken?: string
    serverUser?: User
  }
} 