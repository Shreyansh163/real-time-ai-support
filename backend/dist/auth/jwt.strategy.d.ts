import { Strategy } from "passport-jwt";
import { Role } from "@prisma/client";
type JwtPayload = {
    sub: string;
    role: Role;
    email: string;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): Promise<{
        userId: string;
        role: import(".prisma/client").$Enums.Role;
        email: string;
    }>;
}
export {};
