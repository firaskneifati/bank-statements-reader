import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
              totp_code: credentials?.totpCode || null,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.full_name,
            role: data.user.role,
            orgId: data.user.org_id,
            authProvider: data.user.auth_provider,
            accessToken: data.access_token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/sign-in") ||
        nextUrl.pathname.startsWith("/sign-up") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password");

      if (isPublic) return true; // always allow public pages
      if (!isLoggedIn) return false; // redirect to signIn page
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.orgId = (user as any).orgId;
        token.authProvider = (user as any).authProvider;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.orgId = token.orgId as string;
        session.user.authProvider = token.authProvider as string;
      }
      (session as any).accessToken = token.accessToken as string;
      return session;
    },
  },
});
