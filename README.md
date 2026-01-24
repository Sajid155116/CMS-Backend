# CMS Backend API

Backend API for the CMS project built with NestJS and TypeScript.

## Features

- 🚀 NestJS framework
- 📝 TypeScript with strict mode
- 🔒 Authentication guard ready
- ✅ Class validation
- 📚 Swagger API documentation
- 🎯 Global exception handling
- 📊 Request logging interceptor
- 🔧 Environment configuration
- 🧪 Jest testing setup

## Project Structure

```
backend/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── decorators/     # Custom decorators
│   │   ├── filters/        # Exception filters
│   │   ├── guards/         # Auth guards
│   │   └── interceptors/   # Request interceptors
│   ├── app.controller.ts   # Main controller
│   ├── app.module.ts       # Root module
│   ├── app.service.ts      # Main service
│   └── main.ts            # Entry point
├── test/                   # E2E tests
├── .env.example           # Environment variables template
├── nest-cli.json          # Nest CLI config
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at:
- API: http://localhost:4000/api
- Swagger Docs: http://localhost:4000/api/docs

## Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## API Documentation

Once the application is running, visit http://localhost:4000/api/docs to view the interactive Swagger documentation.

## Development Guidelines

- Use TypeScript strict mode
- Follow NestJS best practices
- Write unit tests for services
- Write e2e tests for controllers
- Use DTOs for data validation
- Implement proper error handling
- Document APIs with Swagger decorators

## Adding New Features

### Create a new module:
```bash
nest g module modules/users
nest g controller modules/users
nest g service modules/users
```

### Create DTOs:
```bash
nest g class modules/users/dto/create-user.dto --no-spec
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Environment Variables

See `.env.example` for all available environment variables.

## License

MIT
