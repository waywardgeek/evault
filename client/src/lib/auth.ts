import NextAuth, { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import { SignJWT, importPKCS8 } from 'jose'

// Determine the correct URL for NextAuth
const getAuthUrl = () => {
  // First check if NEXTAUTH_URL is explicitly set
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  // In production, use the custom domain
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    // Check if we have a custom production URL from Vercel
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    }
    // Fallback to hardcoded custom domain
    return 'https://evaultapp.com'
  }
  
  // For preview deployments, use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Local development fallback
  return 'http://localhost:3000'
}

// Log the determined URL for debugging
const authUrl = getAuthUrl()

// Process Apple secret and generate JWT if needed
function processAppleSecret(secret: string | undefined): string {
  if (!secret) {
    console.error('❌ APPLE_SECRET is not set!')
    return ''
  }
  
  // If it's already a JWT, use it as-is
  if (secret.startsWith('ey')) {
    console.log('✅ Using pre-generated Apple JWT')
    console.log('   JWT length:', secret.length)
    return secret
  }
  
  // If it's a private key, format it properly
  if (secret.includes('BEGIN PRIVATE KEY')) {
    console.log('🔧 Found private key, formatting...')
    // Add line breaks if missing
    if (!secret.includes('\n')) {
      let fixed = secret
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      
      const keyMatch = fixed.match(/-----BEGIN PRIVATE KEY-----\n(.+)\n-----END PRIVATE KEY-----/)
      if (keyMatch) {
        const keyContent = keyMatch[1]
        const formattedKey = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent
        fixed = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`
      }
      return fixed
    }
    return secret
  }
  
  // Unknown format
  console.error('⚠️ APPLE_SECRET format not recognized')
  console.error('   Length:', secret.length)
  console.error('   First 50 chars:', secret.substring(0, 50))
  return secret
}

// Generate Apple JWT from private key
async function generateAppleJWT(privateKey: string): Promise<string> {
  try {
    const teamId = process.env.APPLE_TEAM_ID || 'B2SUY7SU9A'
    const keyId = process.env.APPLE_KEY_ID || '4S892A36WV'
    const clientId = process.env.APPLE_ID || 'com.evaultapp.web'
    
    // Import the private key
    const privateKeyObj = await importPKCS8(privateKey, 'ES256')
    
    // Create and sign the JWT
    const jwt = await new SignJWT({
      sub: clientId,
    })
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuedAt()
      .setIssuer(teamId)
      .setAudience('https://appleid.apple.com')
      .setExpirationTime('6m') // 6 minutes - Apple requires < 6 months
      .sign(privateKeyObj)
    
    console.log('✅ Generated Apple JWT for authentication')
    return jwt
  } catch (error) {
    console.error('❌ Failed to generate Apple JWT:', error)
    throw error
  }
}

const processedAppleSecret = processAppleSecret(process.env.APPLE_SECRET)

// Check if we need to generate JWT or use existing one
let appleClientSecret = processedAppleSecret
if (processedAppleSecret && processedAppleSecret.includes('BEGIN PRIVATE KEY')) {
  // We have a private key, need to generate JWT dynamically
  console.log('🔑 Apple private key detected, will generate JWT dynamically')
  // Create a getter that generates JWT on demand
  appleClientSecret = {
    teamId: process.env.APPLE_TEAM_ID || 'B2SUY7SU9A',
    keyId: process.env.APPLE_KEY_ID || '4S892A36WV',
    privateKey: processedAppleSecret,
  } as any
} else {
  console.log('🔑 Using Apple secret as-is (JWT or empty)')
}




export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || '',
      clientSecret: appleClientSecret,
      checks: ['pkce'], // Disable state check - Apple doesn't return state in form_post
      profile(profile: any) {
        console.log('🍎 Apple Profile Processing:', {
          hasProfile: !!profile,
          profileKeys: profile ? Object.keys(profile) : [],
          profileSub: profile?.sub,
          profileEmail: profile?.email,
          profileName: profile?.name,
          timestamp: new Date().toISOString()
        });
        
        // Log to our custom endpoint
        fetch('https://evaultapp.com/api/oauth-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'apple_profile',
            provider: 'apple',
            profile: profile,
            hasProfile: !!profile
          })
        }).catch(() => {});
        
        return {
          id: profile.sub,
          name: profile.email || profile.sub, // Fallback to email or sub since name scope removed
          email: profile.email || `${profile.sub}@appleid.com`, // Fallback email if not provided
          image: null,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔍 NextAuth SignIn Callback:', {
        provider: account?.provider,
        userId: user?.id,
        userEmail: user?.email,
        hasAccount: !!account,
        hasProfile: !!profile,
        timestamp: new Date().toISOString()
      });
      
      // Log to our custom endpoint
      try {
        await fetch('https://evaultapp.com/api/oauth-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'signin_callback',
            provider: account?.provider,
            userId: user?.id,
            userEmail: user?.email,
            hasIdToken: !!account?.id_token,
            hasAccessToken: !!account?.access_token,
            tokenType: account?.token_type,
            error: account?.error
          })
        });
      } catch (e) {
        console.error('Failed to log:', e);
      }

      // Debug logging for Apple
      if (account?.provider === 'apple') {
        console.log('🍎 Apple Sign-In Debug:', {
          provider: account.provider,
          hasIdToken: !!account.id_token,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          tokenType: account.token_type,
          expiresAt: account.expires_at,
          user: user,
          profile: profile,
          account: account,
          timestamp: new Date().toISOString()
        });

        // Check if we have the required environment variables
        console.log('🔧 Apple Environment Check:', {
          hasAppleId: !!process.env.APPLE_ID,
          hasAppleSecret: !!process.env.APPLE_SECRET,
          appleIdValue: process.env.APPLE_ID,
          appleSecretLength: process.env.APPLE_SECRET?.length || 0
        });
      }

      // Send the OAuth token to our backend server
      if ((account?.provider === 'google' && account.id_token) || 
          (account?.provider === 'apple' && (account.id_token || account.access_token))) {
        try {
          // Exchange provider token for our server JWT by calling our API route
          const baseUrl = authUrl;
          const response = await fetch(`${baseUrl}/api/auth/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_token: account?.provider === 'google' ? account.id_token : (account.id_token || account.access_token),
              provider: account.provider,
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              }
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Store real server JWT token
            account.serverToken = data.token;
            account.serverUser = data.user;
            console.log('✅ Server token exchange successful for', account.provider);
            return true;
          } else {
            const errorText = await response.text();
            console.error('❌ Server authentication failed for', account.provider, ':', errorText);
          }
        } catch (error) {
          console.error('❌ Failed to exchange token with server for', account.provider, ':', error);
        }
      }
      
      // Allow sign-in to proceed
      return true;
    },
    async jwt({ token, account, user }) {
      console.log('🔍 JWT Callback Debug:', {
        hasToken: !!token,
        hasAccount: !!account,
        hasUser: !!user,
        accountProvider: account?.provider,
        timestamp: new Date().toISOString()
      });

      // Apple-specific debugging
      if (account?.provider === 'apple') {
        console.log('🍎 Apple JWT Processing:', {
          tokenKeys: token ? Object.keys(token) : [],
          accountKeys: account ? Object.keys(account) : [],
          hasIdToken: !!account.id_token,
          hasAccessToken: !!account.access_token,
          accountType: account.type,
          timestamp: new Date().toISOString()
        });
      }

      // Persist server token and user data in JWT
      if (account?.serverToken) {
        token.serverToken = account.serverToken;
        token.serverUser = account.serverUser;
      }
      return token;
    },
    async session({ session, token }) {
      // Send server token and user data to the client
      if (token.serverToken) {
        session.serverToken = token.serverToken as string;
        
        // Transform serverUser to match API types (snake_case)
        if (token.serverUser) {
          const dbUser = token.serverUser as any;
          session.serverUser = {
            user_id: dbUser.userId || dbUser.user_id,
            email: dbUser.email,
            phone_number: dbUser.phoneNumber || dbUser.phone_number || undefined,
            auth_provider: dbUser.authProvider || dbUser.auth_provider,
            verified: dbUser.verified,
            openadp_metadata: dbUser.openadpMetadataA || dbUser.openadpMetadataB || dbUser.openadp_metadata || undefined,
            created_at: dbUser.createdAt || dbUser.created_at,
            updated_at: dbUser.updatedAt || dbUser.updated_at,
          };
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('🔄 NextAuth Redirect:', { url, baseUrl });
      
      // Log OAuth initiation for Apple
      if (url.includes('appleid.apple.com/auth/authorize')) {
        console.log('🍎 Apple OAuth URL:', url);
        try {
          const urlObj = new URL(url);
          const params = Object.fromEntries(urlObj.searchParams);
          
          // Log to our custom endpoint
          await fetch('https://evaultapp.com/api/oauth-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'apple_oauth_init',
              url: url,
              params: params,
              clientId: params.client_id,
              redirectUri: params.redirect_uri,
              responseType: params.response_type,
              responseMode: params.response_mode,
              scope: params.scope,
              state: params.state
            })
          }).catch(() => {});
        } catch (e) {
          console.error('Failed to parse Apple OAuth URL:', e);
        }
      }
      
      // If it's a relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If it's the same domain, allow it
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default to home
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true
      }
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        sameSite: 'none',
        path: '/',
        secure: true
      }
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true
      }
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    // Add explicit state cookie configuration for Apple OAuth
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        maxAge: 60 * 15, // 15 minutes
      },
    },
  },
  useSecureCookies: true,
  debug: process.env.NODE_ENV === 'development', // Only debug in development
  logger: {
    error(code: any, ...message: any[]) {
      console.error('🚨 NextAuth Error:', code, message);
      // Log Apple-specific errors with more detail
      if (code?.toString().includes('apple') || code?.toString().includes('Apple')) {
        console.error('🍎 Apple-specific error details:', {
          code: code,
          message: message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Log errors to our custom endpoint
      fetch('https://evaultapp.com/api/oauth-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'nextauth_error',
          code: code?.toString(),
          message: message,
          isAppleError: code?.toString().includes('apple') || code?.toString().includes('Apple')
        })
      }).catch(() => {});
    },
    warn(code: any, ...message: any[]) {
      console.warn('⚠️ NextAuth Warning:', code, message);
    },
    debug(code: any, ...message: any[]) {
      console.log('🔍 NextAuth Debug:', code, message);
    }
  }
}

export default NextAuth(authOptions) // Force deployment Fri Jul 11 06:40:04 AM PDT 2025
// Force redeploy Fri Jul 11 07:17:09 AM PDT 2025
