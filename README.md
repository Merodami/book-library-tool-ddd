# Book library tool

This project implements a backend system for the Royal Library of Belgium.

The library has a vast collection of book references (100 million entries) and 50k users.

Users can search for books, make reservations, borrow books, and manage their wallet balances.

## Key Functionalities

### References (Books) Management

- **Add a Reference**: Create a new book reference in the system.
- **Get a Reference**: Retrieve information for a specific book reference by ID.
- **Delete a Reference**: Remove an existing book reference from the catalog.

### Catalog Search

- Search for books by publication year, title, or author.

### Reservation & Borrowing System

- Users can borrow up to 3 different books at once.
- For each reference, 4 copies exist.
- Users cannot borrow multiple copies of the same reference simultaneously.
- Each book reservation costs 3 euros.
- The system tracks book availabilities and the history of reservations.

### Reminders

- **Upcoming Due**: Users receive an email 2 days before their due date.
- **Late Return**: Users receive an email reminder 7 days after the due date if they haven’t returned the book.

### Wallet & Fees

- Each user has a wallet to pay for reservations and late fees.
- A late fee of **€0.20/day** applies for overdue books. (See [env](./.env.local) variable LATE_FEE_PER_DAY)
- If late fees reach the retail price of the book, the user effectively buys it.

## Contents

- [Book library tool](#book-library-tool)
  - [Key Functionalities](#key-functionalities)
    - [References (Books) Management](#references-books-management)
    - [Catalog Search](#catalog-search)
    - [Reservation \& Borrowing System](#reservation--borrowing-system)
    - [Reminders](#reminders)
    - [Wallet \& Fees](#wallet--fees)
  - [Contents](#contents)
  - [ToDo](#todo)
  - [API Endpoints](#api-endpoints)
    - [Books](#books)
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
  - [Troubleshooting](#troubleshooting)
    - [Ports already in use](#ports-already-in-use)

## ToDo

Sadly I don't have more time assigned to this implementation.

- Request caching mechanism

- A cronjob for the email feature or alternatively, for more complex scenarios (e.g., job persistence, retries, or distributed tasks), use packages like Agenda or even use a cloud scheduler (like AWS CloudWatch Events triggering an AWS Lambda function).

- Use of @testcontainers for emulate real database interactions on tests.

- Implementation of MailHog/MailTrap (to test email sending locally, currently is a console log).

## API Endpoints

API docs on browser running this command

```sh
yarn api:docs
```

On the API docs you will find schema description, examples and a execution UI.

> **Note**: If API token authentication is enabled, include `Authorization: Bearer <token>` in the request header.

### Books

- **POST** `/books`  
  Creates a new book reference.

  - Required body fields: `id`, `title`, `author`, `publicationYear`, `publisher`

- **GET** `/books/{referenceId}`  
  Retrieves a book reference by its `referenceId`.

- **DELETE** `/books/{referenceId}`  
  Deletes a book reference by its `referenceId`.

### Reservations

- **POST** `/reservations`  
  Creates a new reservation (requires `userId` and `referenceId` in the body).

- **GET** `/reservations/user/{userId}`  
  Retrieves reservation history for a specific `userId`.

- **PATCH** `/reservations/{reservationId}/return`  
  Marks a reservation as returned.

### Wallets

- **GET** `/wallets/{userId}`  
  Retrieves wallet details (e.g., `balance`, `updatedAt`) for the specified `userId`.

- **POST** `/wallets/{userId}/balance`  
  Modifies the user’s wallet balance.

  - Required body field: `amount` (number)

- **PATCH** `/wallets/{userId}/late-return`  
  Applies a late fee based on `daysLate` and `retailPrice`.
  - If fees exceed the book’s price, the user effectively buys the book.

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
This will also automatically execute the initial migration (packages/database/mongo/init-mongo.js)
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

## Troubleshooting

### Ports already in use

If a process complains that a port is already in use, then the program likely wasn't shut down successfully. Run `yarn kill`.
