import NextAuth, { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || '',
      clientSecret: process.env.APPLE_SECRET || '',
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Send the OAuth token to our backend server
      if ((account?.provider === 'google' && account.id_token) || 
          (account?.provider === 'apple' && account.id_token)) {
        try {
          // Exchange provider token for our server JWT by calling the real Go server
          const serverURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
          const response = await fetch(`${serverURL}/api/auth/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_token: account.id_token,
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
            return true;
          } else {
            const errorText = await response.text();
            console.error('Server authentication failed:', errorText);
          }
        } catch (error) {
          console.error('Failed to exchange token with server:', error);
        }
      }
      return true; // Allow sign in even if server exchange fails (for development)
    },
    async jwt({ token, account, user }) {
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
        session.serverUser = token.serverUser as any;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If no specific URL provided, redirect to vault
      if (url === baseUrl) {
        return `${baseUrl}/vault`;
      }
      // If it's a relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If it's the same domain, allow it
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default to vault
      return `${baseUrl}/vault`;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}

export default NextAuth(authOptions) 