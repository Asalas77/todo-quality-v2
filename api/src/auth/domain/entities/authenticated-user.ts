export class AuthenticatedUser {
  constructor(
    readonly userId: string,
    readonly tenantId: string,
    readonly permissions: readonly string[],
  ) {}

  can(permission: string): boolean {
    return this.permissions.includes(permission);
  }
}
