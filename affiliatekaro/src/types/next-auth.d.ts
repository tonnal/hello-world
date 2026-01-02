import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    organizationId: string;
  }

  interface Session {
    userId: string;
    organizationId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
  }
}

