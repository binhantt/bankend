# Backend API Service

## Description
A RESTful API service built with Express.js and TypeScript, featuring user authentication, product management, and Excel data import/export functionality.

## Technologies
- Node.js
- TypeScript
- Express.js
- MySQL
- Kysely (SQL Query Builder)
- JWT Authentication
- Bcrypt for password hashing
- XLSX for Excel handling

## Features

### Authentication
- User registration
- User login
- Captcha verification
- JWT token management
- Password encryption

### Category Management
- Create categories
- List all categories
- Update category details
- Delete categories

### Product Management
- Create products
- List all products
- Update product details
- Delete products
- Product search and filtering
- Product categories
- Product manufacturers

### Manufacturer Management
- Create manufacturers
- List all manufacturers
- Update manufacturer details
- Delete manufacturers

### Excel Data Import/Export
- Export data to Excel
  - Categories
  - Manufacturers
  - Products
- Import data from Excel
  - Automatic duplicate handling
  - Data validation
  - Error logging
- Scheduled automatic import
  - Configurable import schedule
  - Real-time import status

## Database Structure

### Categories
- id (Primary Key)
- name
- image
- id_categories
- created_at
- updated_at

### Manufacturers
- id (Primary Key)
- name
- address
- phone
- created_at
- updated_at

### Products
- id (Primary Key)
- name
- description
- id_categories
- price
- is_active
- manufacturer_id (Foreign Key)
- main_image_url
- stock
- sku (Unique)
- weight
- dimensions
- quantity
- created_at
- updated_at

## Installation Guide

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Git

### Step 1: Clone Project
```bash
git clone https://github.com/yourusername/doanbankend.git
cd doanbankend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Setup
```bash
npx ts-node src/scripts/migrate.ts latest
```

### Step 4: Start the Application
Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Excel Import/Export Usage

### Export Data
```bash
npx ts-node src/scripts/exportToExcel.ts
```
This will create an Excel file at `D:\duan\data.xlsx` with three sheets:
- Categories
- Manufacturers
- Products

### Import Data
Manual import:
```bash
npx ts-node src/scripts/importFromExcel.ts D:\duan\data.xlsx
```

Automatic scheduled import:
```bash
npx ts-node src/scripts/autoImport.ts
```
The automatic import will:
1. Run immediately when started
2. Continue running on schedule (default: daily at 00:00)
3. Handle duplicates automatically
4. Log all import activities

## API Endpoints

### Authentication
```bash
POST /auth/register    # User registration
POST /auth/login      # User login
GET  /auth/generate   # Generate captcha
```

### Categories
```bash
GET    /categories     # List all categories
POST   /categories     # Create new category
PUT    /categories/:id # Update category
DELETE /categories/:id # Delete category
```

### Manufacturers
```bash
GET    /manufacturers     # List all manufacturers
POST   /manufacturers     # Create new manufacturer
PUT    /manufacturers/:id # Update manufacturer
DELETE /manufacturers/:id # Delete manufacturer
```

### Products
```bash
GET    /products     # List all products
POST   /products     # Create new product
PUT    /products/:id # Update product
DELETE /products/:id # Delete product
```