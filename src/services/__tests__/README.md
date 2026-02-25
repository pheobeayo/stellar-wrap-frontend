# Unit Tests for Indexer and Achievement Calculator Services

This directory contains comprehensive unit tests for the Stellar Horizon API Indexer Service and the Achievement Calculator Service.

## Overview

These tests are written following Test-Driven Development (TDD) principles. The test files define the expected behavior and interfaces for the services before their implementation. Once the services are implemented (issues #34 and #40), these tests will validate their correctness.

## Test Structure

### Test Files

- `indexer/__tests__/indexer.service.test.ts` - Tests for the indexer service
- `achievement/__tests__/achievement-calculator.test.ts` - Tests for the achievement calculator service

### Test Utilities

- `test-utils.ts` - Helper functions for creating mock data and test scenarios
- `fixtures.ts` - Pre-defined test data fixtures for common scenarios

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage Goals

- **Target Coverage**: 80%+ for all services
- **Coverage Areas**:
  - All public methods
  - Edge cases
  - Error handling
  - Boundary conditions

## Test Categories

### Indexer Service Tests

1. **Transaction Fetching**
   - Valid account transactions
   - Pagination handling
   - Ordering (asc/desc)
   - Limit parameter
   - Network support (mainnet/testnet)

2. **Timeframe Filtering**
   - 1 week filtering
   - 2 week filtering
   - 1 month filtering
   - Boundary conditions

3. **Validation**
   - Transaction structure validation
   - Invalid data handling
   - Missing field detection

4. **Error Handling**
   - API errors
   - Network timeouts
   - Rate limiting
   - Malformed responses

### Achievement Calculator Tests

1. **Volume Calculation**
   - Single payments
   - Multiple payments
   - Different assets
   - Zero volume
   - Decimal precision

2. **Asset Identification**
   - Native XLM
   - Issued assets
   - Unique asset detection
   - Issuer information

3. **Contract Call Counting**
   - invokeHostFunction operations
   - extendFootprintTtl operations
   - Mixed operations
   - Zero contract calls

4. **Edge Cases**
   - Empty transactions
   - Missing data
   - Invalid amounts
   - Future dates
   - Large transaction sets

## Test Data Fixtures

The `fixtures.ts` file provides pre-configured test data for common scenarios:

- `EMPTY_TRANSACTIONS` - Empty transaction array
- `SINGLE_TRANSACTION` - Single transaction
- `XLM_PAYMENT_TRANSACTIONS` - Multiple XLM payments
- `ISSUED_ASSET_TRANSACTIONS` - Transactions with issued assets
- `CONTRACT_CALL_TRANSACTIONS` - Transactions with contract calls
- `MIXED_TRANSACTIONS` - Mixed transaction types
- `ONE_WEEK_TRANSACTIONS` - Transactions within 1 week
- `TWO_WEEK_TRANSACTIONS` - Transactions within 2 weeks
- `ONE_MONTH_TRANSACTIONS` - Transactions within 1 month
- `ZERO_VOLUME_TRANSACTIONS` - Transactions with no volume
- `EQUAL_ASSET_COUNT_TRANSACTIONS` - Transactions with equal asset counts

## Test Utilities

The `test-utils.ts` file provides helper functions:

- `createMockTransaction()` - Create mock Horizon transaction
- `createMockOperation()` - Create mock Horizon operation
- `createMockIndexedTransaction()` - Create mock indexed transaction
- `createMockPaymentOperation()` - Create mock payment operation
- `createMockContractOperation()` - Create mock contract operation
- `createTransactionsInTimeframe()` - Create transactions within timeframe
- `createMultiAssetTransactions()` - Create transactions with multiple assets
- `createContractCallTransactions()` - Create transactions with contract calls

## Writing New Tests

When adding new tests:

1. Use the provided test utilities and fixtures when possible
2. Follow the existing test structure and naming conventions
3. Test both success and error cases
4. Include edge cases and boundary conditions
5. Ensure tests are isolated and don't depend on each other
6. Use descriptive test names that explain what is being tested

## Dependencies

These tests depend on:

- **Jest** - Testing framework
- **TypeScript** - Type checking
- **Service implementations** - Once issues #34 and #40 are completed

## Notes

- Tests are currently set up to fail until the services are implemented
- The test files include TODO comments indicating where service initialization should occur
- Once services are implemented, remove the placeholder comments and initialize the services properly
- All tests use TypeScript for type safety
