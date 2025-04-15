# Book Library Tool

This project implements a backend system for the Royal Library of Belgium.

The library has a vast collection of book references (100 million entries) and 50k users.

Users can search for books, make reservations, borrow books, and manage their wallet balances.

## Contents

- [Book Library Tool](#book-library-tool)
  - [Contents](#contents)
  - [Architecture](#architecture)
    - [Domain-Driven Design (DDD)](#domain-driven-design-ddd)
    - [Hexagonal Architecture](#hexagonal-architecture)
    - [CQRS (Command Query Responsibility Segregation)](#cqrs-command-query-responsibility-segregation)
    - [Event Sourcing](#event-sourcing)
    - [Event-Driven Architecture](#event-driven-architecture)
    - [Microservices](#microservices)
  - [Key Functionalities](#key-functionalities)
    - [References (Books) Management](#references-books-management)
    - [Catalog Search](#catalog-search)
    - [Reservation \& Borrowing System](#reservation--borrowing-system)
    - [Reminders](#reminders)
    - [Wallet \& Fees](#wallet--fees)
  - [Technical Implementation](#technical-implementation)
    - [Database Layer](#database-layer)
    - [Caching System](#caching-system)
      - [Redis Implementation](#redis-implementation)
      - [GraphQL Caching](#graphql-caching)
      - [Cache Configuration](#cache-configuration)
      - [Cache Invalidation](#cache-invalidation)
  - [API Endpoints](#api-endpoints)
    - [Services](#services)
    - [Books](#books)
    - [Catalog](#catalog)
    - [Reservations](#reservations)
    - [Wallets](#wallets)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Description](#description)
    - [Setup](#setup)
      - [For development](#for-development)
    - [Setting up husky (Run automatically lint + test on commit)](#setting-up-husky-run-automatically-lint--test-on-commit)
    - [API Changes](#api-changes)
    - [Environment](#environment)
    - [Auth configuration](#auth-configuration)
    - [Git hooks](#git-hooks)
    - [Testing](#testing)
      - [Unit tests](#unit-tests)
  - [ToDo](#todo)
  - [Troubleshooting](#troubleshooting)
    - [Ports already in use](#ports-already-in-use)

## Architecture

This system is built using several modern architectural patterns to ensure scalability, maintainability, and resilience:

### Domain-Driven Design (DDD)

- **Aggregates**: Core domain entities like Book and Reservation are modeled as aggregates with clear boundaries
- **Value Objects**: Immutable objects like ISBN and dates are implemented as value objects
- **Domain Events**: System uses events like BookCreated, ReservationConfirmed to communicate state changes
- **Bounded Contexts**: Clear separation between domains (Books, Reservations, Wallets)

### Hexagonal Architecture

- **Domain Core**: Business logic isolated from external concerns
- **Ports & Adapters**: Well-defined interfaces (ports) with interchangeable implementations (adapters)
- **Inversion of Control**: Dependencies flow inward toward the domain

### CQRS (Command Query Responsibility Segregation)

- **Command Handlers**: Dedicated handlers for state-changing operations (CreateBookHandler, BookReturnHandler)
- **Query Handlers**: Separate handlers for read operations (GetBookHandler, GetReservationHistoryHandler)
- **Separate Data Models**: Write models are event-sourced, read models are denormalized projections

### Event Sourcing

- **Event Storage**: All state changes are stored as immutable events
- **Event Projections**: Read models are built by processing events
- **Event Replay**: System state can be reconstructed by replaying events

### Event-Driven Architecture

- **RabbitMQ Message Broker**: Handles asynchronous communication between services
- **Eventual Consistency**: Services maintain consistency through event propagation
- **Message Durability**: Events are persisted to ensure reliability

### Microservices

- **Books Service**: Manages book references and catalog
- **Reservations Service**: Handles book reservations and returns
- **Wallet Service**: Manages user balances and payments

## Key Functionalities

### References (Books) Management

- **Add a Reference**: Create a new book reference in the system.
- **Get a Reference**: Retrieve information for a specific book reference by ID.
- **Delete a Reference**: Remove an existing book reference from the catalog.
- **Caching**: Frequently accessed book data is cached for improved performance.

### Catalog Search

- Search for books by publication year, title, or author.
- Results are cached with configurable TTL for improved response times.

### Reservation \& Borrowing System

- Users can borrow up to 3 different books at once.
- For each reference, 4 copies exist.
- Users cannot borrow multiple copies of the same reference simultaneously.
- Each book reservation costs 3 euros.
- The system tracks book availabilities and the history of reservations.

### Reminders

- **Upcoming Due**: Users receive an email 2 days before their due date.
- **Late Return**: Users receive an email reminder 7 days after the due date if they haven't returned the book.

### Wallet \& Fees

- Each user has a wallet to pay for reservations and late fees.
- A late fee of **€0.20/day** applies for overdue books. (See [env](./.env.local) variable LATE_FEE_PER_DAY)
- If late fees reach the retail price of the book, the user effectively buys it.

## Technical Implementation

### Database Layer

- **MongoDB Integration**: Robust connection management with retry logic for transient failures
- **Connection Pooling**: Configurable pool sizes and timeouts
- **Resource Cleanup**: Automatic cleanup of resources on application shutdown
- **Performance Monitoring**: Tracking of query performance and error rates

### Caching System

The system implements a sophisticated caching layer with multiple strategies to ensure optimal performance:

- **In-Memory Caching**: Intelligent caching system with TTL support for frequently accessed data
- **Resource Management**: Automatic cleanup of resources on application shutdown
- **Cache Invalidation**: Support for selective cache invalidation by collection
- **Performance Metrics**: Tracking of cache hits, misses, and query performance

#### Redis Implementation

Redis provides the primary caching mechanism with the following features:

- **Method-Level Caching**: Using the `@Cache` decorator to cache method results
- **Configurable TTL**: Cache entries can have different time-to-live values
- **Automatic Serialization**: Complex objects are automatically serialized for storage
- **Health Checks**: Redis connection health monitoring
- **Error Handling**: Graceful fallback when Redis is unavailable

Example usage:

```typescript
@Cache(60) // Cache for 60 seconds
async getBooks() {
  // Method implementation
}
```

#### GraphQL Caching

The GraphQL layer implements multiple caching strategies:

1. **Resolver-Level Caching**:

   - Individual resolvers can be cached using the `@Cache` decorator
   - Cache keys are generated based on query parameters
   - Automatic cache invalidation on mutations

2. **Response Caching**:

   - Apollo Server's built-in response caching
   - Configurable max-age for different types of queries
   - Cache control directives support

3. **DataLoader Caching**:
   - Batch loading of related data
   - Request-level caching of loaded entities
   - Automatic cache invalidation on updates

Example resolver with caching:

```typescript
@Cache(300) // Cache for 5 minutes
async book(_, { isbn }, context) {
  return context.bookLoader.load(isbn);
}
```

#### Cache Configuration

The caching system can be configured through environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DEFAULT_TTL=3600
```

#### Cache Invalidation

Cache invalidation is handled automatically for:

- Book creation/updates/deletion
- Reservation changes
- User data modifications

Manual cache invalidation is also supported:

```typescript
await invalidateCache(target, methodName, context)
await clearClassCache(target, context)
```

## API Endpoints

API docs on browser running this command

```sh
yarn api:docs
```

On the API docs you will find schema description, examples and a execution UI.

> **Note**: All API endpoints require authentication. Include `Authorization: Bearer <token>` in the request header.

### Services

- **Books Service**: `http://localhost:3001`
- **Reservations Service**: `http://localhost:3002`
- **Reminder Service**: `http://localhost:3003`

### Books

- **POST** `/books`  
  Creates a new book reference.

  - Required body fields: `isbn`, `title`, `author`, `publicationYear`, `publisher`, `price`

- **GET** `/books/{isbn}`
  Retrieves a book reference by its `isbn`.

- **PATCH** `/books/{isbn}`
  Updates a book reference by its `isbn`.

- **DELETE** `/books/{isbn}`
  Deletes a book reference by its `isbn`.

### Catalog

- **GET** `/catalog`  
  Retrieves a list of books with optional search parameters.

  - Query Parameters:
    - `title`: Search by book title
    - `author`: Search by author name
    - `publicationYear`: Search by publication year
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 10, max: 100)

### Reservations

- **POST** `/reservations`  
  Creates a new reservation (requires `userId` and `isbn` in the body).

- **GET** `/reservations/user/{userId}`  
  Retrieves reservation history for a specific `userId`.

- **PATCH** `/reservations/{reservationId}/return`  
  Marks a reservation as returned.

### Wallets

- **GET** `/wallets/{userId}`  
  Retrieves wallet details (e.g., `balance`, `updatedAt`) for the specified `userId`.

- **POST** `/wallets/{userId}/balance`  
  Modifies the user's wallet balance.

  - Required body field: `amount` (number)

## Installation

### Prerequisites

- Have NodeJS installed. See the `.nvmrc` file for the version.
- Have installed yarn via `npm install -g yarn`.
- Have installed nx via `npm install -g nx`.

### Description

**_This projects was created with_**

Node.js: v20.x (LTS)

- Recommended exact version: 20.19.0 (project also tested on 20.10.0).
- The project uses ESM modules and may break on older or incompatible Node versions.

Yarn: 4.7.0

- Specified in the packageManager field of package.json.
- Using any other Yarn version may cause unexpected behavior with workspaces or dependency resolution.

Docker: 23.0.5 (build bc4487a)

- Required for running MongoDB locally via docker-compose.local.yml.
- Ensure you have Docker Engine and Docker Compose v2 installed and running.

Nx CLI: ^20.7.0

- Although Nx is installed locally as a dev dependency, you may also install it globally (npm install -g nx) for convenience.
- Nx manages tasks across multiple packages and provides commands like nx run-many, nx graph, etc.

Vitest: ^3.1.1

- Used for testing instead of Jest due to better ESM support and faster execution.
- Run tests with yarn test.

Husky & Lint-Staged:

- Enforces linting and testing on commits.
- Husky hooks automatically run ESLint, Prettier, and Vitest on staged files.
- This ensures code integrity before changes land in the repository.

Prettier & ESLint:

- Code formatting and linting are handled via Prettier and ESLint, including plugins like eslint-plugin-security and eslint-plugin-sonarjs.
- A .prettierrc or equivalent config ensures consistent code style.
- Run yarn lint or yarn lint:fix to verify/fix code style and potential issues.

Monorepo Structure (Nx Workspaces):

- The project is organized into multiple packages under packages/ (e.g., api, database, auth, sdk, shared, wallets).
- Each package may contain its own tsconfig.json, tests, and build configurations.
- Nx commands (e.g., nx run @book-library-tool/api:build) coordinate tasks across these packages.

### Setup

Install dependencies and :

```sh
yarn

```

Generate API schemas, docs and types (This is only executed this time or when schema changes)

```sh
yarn generate:api && yarn generate:sdk
```

Build the project

```sh
yarn build
```

Now we need to create the docker instance of MongoDB
This will also automatically execute the initial migration (packages/database/src/mongo/initDatabase.js)
that sets initial database schema

```sh
yarn docker:local
```

Seed the database with all the books from books_sample_technical_challenge.csv

```sh
yarn database:seed
```

Create a user and token (routes are protected by token)
Remember to store the userId and token for later use on API

```sh
yarn user:create foo@email.com
```

Finally this command executes all services/modules in watch mode.

```sh
yarn local
```

To see the API Documentation & Test interface

```sh
yarn api:docs
```

Now you should be able to make requests to the services (Token required)

```sh
localhost:3001 > Books service
localhost:3002 > Wallet service
```

**_[All the API can be tested directly on the API Docs in Swagger](#api-endpoints)_**

#### For development

### Setting up husky (Run automatically lint + test on commit)

Set pre-commit hooks with husky

```sh
yarn run husky
```

### API Changes

The API schema (packages/api) generates the types used in the project to keep consistency between code written
and the API expectations.

Any changes on the API requires to re-generate the types with this command. This will generate the API and related SDK references.

```sh
yarn generate:api && yarn generate:sdk
```

### Environment

Create a .env for your local environment based on the .env.local template.

### Auth configuration

Before getting into development the auth setup needs to be in place.
Please refer to the setup guide in [packages/auth/README.md](./packages/auth/README.md)

### Git hooks

This project uses [husky](https://typicode.github.io/husky/) to install and manage git hooks.

To install the hooks, run `yarn run husky`.

There is only one hook at the moment that run eslint and prettier against staged files, fixes any
auto-fixable issues and commits the changes.

- Unit tests are executed as a pre-commit hook for staged files
- Eslint and prettier is executed against staged files, fixes any auto-fixable issues and commits the changes

### Testing

#### Unit tests

Unit and integration tests can be run with the following commands:

```sh
yarn test
```

Note, `--watch` is optional. All use vitest.

## ToDo

Sadly I don't have more time assigned to this implementation.

- Request caching mechanism

- A cronjob for the email feature or alternatively, for more complex scenarios (e.g., job persistence, retries, or distributed tasks), use packages like Agenda or even use a cloud scheduler (like AWS CloudWatch Events triggering an AWS Lambda function).

- Use of @testcontainers for emulate real database interactions on tests.

- Implementation of MailHog/MailTrap (to test email sending locally, currently is a console log).

## Troubleshooting

### Ports already in use

If a process complains that a port is already in use, then the program likely wasn't shut down successfully. Run `yarn kill`.
