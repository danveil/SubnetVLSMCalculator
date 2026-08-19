export class NetworkInputError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "NetworkInputError";
  }
}

export function assertPrefix(prefix: number): void {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new NetworkInputError(
      `/${String(prefix)} is invalid. IPv4 prefix lengths must be between /0 and /32.`,
      "INVALID_PREFIX",
    );
  }
}

export function assertUnsignedIPv4Integer(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new NetworkInputError(
      `${String(value)} is outside the unsigned 32-bit IPv4 range.`,
      "INVALID_IPV4_INTEGER",
    );
  }
}

export function assertHostRequirement(value: number, name = "Network"): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new NetworkInputError(
      `${name} must require a positive whole number of hosts.`,
      "INVALID_HOST_REQUIREMENT",
    );
  }
  if (value > 0xffff_fffe) {
    throw new NetworkInputError(
      `${name} requests more hosts than any IPv4 network can provide.`,
      "IMPOSSIBLE_HOST_REQUIREMENT",
    );
  }
}

export function normalizedRequirementName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new NetworkInputError(
      "Network names cannot be empty.",
      "EMPTY_NETWORK_NAME",
    );
  }
  if (normalized.length > 100) {
    throw new NetworkInputError(
      "Network names must contain 100 characters or fewer.",
      "NETWORK_NAME_TOO_LONG",
    );
  }
  return normalized;
}
