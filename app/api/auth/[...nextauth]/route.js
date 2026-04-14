import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Optional: restrict to specific email domains
    // Uncomment the lines below to only allow @umww.com emails
    // async signIn({ user }) {
    //   return user.email.endsWith('@umww.com');
    // },
  },
});

export { handler as GET, handler as POST };
