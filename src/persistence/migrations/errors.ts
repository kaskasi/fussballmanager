export class SaveReadOnlyError extends Error {
  constructor(migrationId: string) {
    super(`Migration ${migrationId} failed. The save is a read-only backup; start a new game.`);
    this.name = "SaveReadOnlyError";
  }
}
