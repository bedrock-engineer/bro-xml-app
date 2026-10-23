import { bronhouderNames } from "./bronhouders-data";

/**
 * Organization identified by KvK number as display text: the registered
 * name when known, with the number in parentheses; otherwise the raw number.
 */
export function formatKvkParty(kvkNumber: string): string {
  const name = bronhouderNames[kvkNumber];
  return name ? `${name} (KvK ${kvkNumber})` : kvkNumber;
}
