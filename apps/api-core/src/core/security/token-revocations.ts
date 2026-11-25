export abstract class TokenRevocations {
  abstract isRevoked(userId: string, issuedAt: Date): Promise<boolean>;
}
