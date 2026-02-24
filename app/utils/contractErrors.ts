/**
 * Errors for network-aware contract loading and validation.
 */

export class ContractConfigurationError extends Error {
  constructor(
    message: string,
    public readonly network?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ContractConfigurationError";
    Object.setPrototypeOf(this, ContractConfigurationError.prototype);
  }
}

export class InvalidContractAddressError extends ContractConfigurationError {
  constructor(address: string, network?: string) {
    super(
      `Invalid contract address${network ? ` for ${network}` : ""}: must be 56 characters, C-prefix, base32.`,
      network
    );
    this.name = "InvalidContractAddressError";
  }
}

export class ContractNotFoundError extends ContractConfigurationError {
  constructor(network: string, cause?: unknown) {
    super(`Contract not found on ${network}.`, network, cause);
    this.name = "ContractNotFoundError";
  }
}

export class ContractValidationError extends ContractConfigurationError {
  constructor(
    message: string,
    network?: string,
    cause?: unknown
  ) {
    super(message, network, cause);
    this.name = "ContractValidationError";
  }
}

export class NetworkMismatchError extends ContractConfigurationError {
  constructor(expected: string, actual: string) {
    super(`Network mismatch: expected ${expected}, got ${actual}.`);
    this.name = "NetworkMismatchError";
  }
}
