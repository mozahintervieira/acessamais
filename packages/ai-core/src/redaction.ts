const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redactPersonalData(input: string): string {
  return input.replace(EMAIL_PATTERN, "[REDACTED_EMAIL]");
}
