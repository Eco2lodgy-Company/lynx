import { JWT, DefaultJWT } from "next-auth/jwt";
import { Role } from "@lynx/types";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: Role;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role: Role;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        role: Role;
        id: string;
    }
}
