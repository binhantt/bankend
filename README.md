# Backend API Service

## Description
A RESTful API service built with Express.js and TypeScript, featuring user authentication and category management.

## Technologies
- Node.js
- TypeScript
- Express.js
- MySQL
- Kysely (SQL Query Builder)
- JWT Authentication
- Bcrypt for password hashing

## Features
- User Authentication
  - Registration
  - Login
  - Captcha verification
  - JWT token management
  - Password encryption

- Category Management
  - Create categories
  - List all categories
  - Update category details
  - Delete categories

## API Endpoints

### Authentication
```bash
POST /auth/register    # User registration
POST /auth/login      # User login
GET  /auth/generate   # Generate captcha
```

## Installation Guide

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Git

## Git Repository Setup

1. Initialize Git repository:
```bash
git init
```
2.table 
```bash
npx ts-node src/scripts/migrate.ts latest
```
3. Start the application:
```bash
npm run dev
``` 
4. Run the application:
```bash
npm start
```

### Step 1: Clone Project
```bash
git clone https://github.com/yourusername/doanbankend.git
cd doanbankend
```