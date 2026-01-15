/**
 * Command execution result
 * All commands must return this shape.
 */

export type CommandStatus = "ALLOWED" | "BLOCKED";

export interface CommandResult {
  status: CommandStatus;
  reason?: string;
  events?: any[]; // events to emit if allowed
}
