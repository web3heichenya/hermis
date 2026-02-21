export function extractViemErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const viemError = error as { shortMessage?: string; message?: string };
    if (viemError.shortMessage) return viemError.shortMessage;
    if (viemError.message) return viemError.message;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
