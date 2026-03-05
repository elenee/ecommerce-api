# E-Commerce API

A production-grade REST API for an e-commerce platform built with NestJS, PostgreSQL, and Prisma. Features JWT authentication, Stripe payments, AWS S3 image storage, Redis caching, and SendGrid email notifications.

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Payments:** Stripe
- **Image Storage:** AWS S3
- **Email:** SendGrid
- **Auth:** JWT (access + refresh tokens)
- **Containerization:** Docker + Docker Compose

## Features

- JWT authentication with refresh tokens and role-based access control (Admin / Customer)
- Product management with image uploads to AWS S3, variants, pagination, and filtering
- Shopping cart with stock validation
- Order management with full lifecycle (Pending → Paid → Shipped → Delivered / Cancelled)
- Stripe payment integration with webhook handling
- Coupon system with percentage and fixed discounts
- Product reviews and wishlist
- Redis caching with version-based cache invalidation
- Transactional email notifications at every order lifecycle event via SendGrid
- Rate limiting on authentication endpoints

## Getting Started

### Prerequisites

- Docker and Docker Compose
- AWS account with an S3 bucket
- Stripe account
- SendGrid account

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/ecommerce_api

# JWT
JWT_SECRET=your_jwt_secret

# AWS S3
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket_name

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_SENDER_EMAIL=your_verified_email@example.com
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=d-...
SENDGRID_PAYMENT_CONFIRMED_TEMPLATE_ID=d-...
SENDGRID_ORDER_SHIPPED_TEMPLATE_ID=d-...
SENDGRID_ORDER_DELIVERED_TEMPLATE_ID=d-...
SENDGRID_ORDER_CANCELLED_TEMPLATE_ID=d-...

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Admin Seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=Admin
```

### Running with Docker

```bash
docker-compose up --build
```

This will:
- Start the PostgreSQL database
- Start the Redis cache
- Run database migrations
- Seed the admin user
- Start the API on port 3000

### Running Locally

```bash
# Install dependencies
npm install

# Run migrations
npx prisma migrate dev

# Start in development mode
npm run start:dev
```

> When running locally, set `DATABASE_URL` to use `localhost` instead of `db`, and `REDIS_HOST` to `localhost`.

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /auth/sign-up | Public | Register a new user |
| POST | /auth/sign-in | Public | Login |
| GET | /auth/me | Auth | Get current user |
| POST | /auth/refresh-token | Public | Refresh access token |

### Products
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /products | Public | List products with pagination and filters |
| GET | /products/:id | Public | Get product by ID |
| POST | /products | Admin | Create product with images |
| PATCH | /products/:id | Admin | Update product |
| DELETE | /products/:id | Admin | Delete product |
| POST | /products/:id/variants | Admin | Add variant |
| POST | /products/:id/images | Admin | Add images |
| DELETE | /products/:id/images/:imageId | Admin | Delete image |

### Cart
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /cart | Auth | Get cart |
| POST | /cart/add | Auth | Add item to cart |
| DELETE | /cart/remove/:productId | Auth | Remove item from cart |
| DELETE | /cart/clear | Auth | Clear cart |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /orders | Auth | Create order |
| GET | /orders | Auth | Get user orders |
| GET | /orders/:id | Auth | Get order by ID |
| PATCH | /orders/:id/cancel | Auth | Cancel order |
| GET | /orders/all | Admin | Get all orders |
| PATCH | /orders/:id/status | Admin | Update order status |

### Payments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /payments/create-payment-intent/:orderId | Auth | Create Stripe payment intent |
| POST | /payments/confirm-payment | Auth | Confirm payment |
| POST | /payments/webhook | Public | Stripe webhook handler |

### Coupons
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /coupons | Admin | Create coupon |
| GET | /coupons | Admin | List coupons |
| PATCH | /coupons/:id | Admin | Update coupon |
| DELETE | /coupons/:id | Admin | Delete coupon |
| POST | /coupons/:orderId/apply | Auth | Apply coupon to order |

### Reviews
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /reviews/:productId | Auth | Create review |
| GET | /reviews/:productId | Public | Get product reviews |
| DELETE | /reviews/:id | Auth | Delete review |

### Wishlist
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /wishlist | Auth | Get wishlist |
| POST | /wishlist/:productId | Auth | Add to wishlist |
| DELETE | /wishlist/:productId | Auth | Remove from wishlist |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| PATCH | /users/me | Auth | Update profile |
| POST | /users/me/addresses | Auth | Add address |
| GET | /users | Admin | List all users |

### Categories
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /category | Admin | Create category |
| GET | /category | Public | List categories |
| PATCH | /category/:id | Admin | Update category |
| DELETE | /category/:id | Admin | Delete category |

## Running Tests

```bash
# Unit tests
npm run test
```

## Project Source

This project was built as part of the [roadmap.sh E-Commerce API](https://roadmap.sh/projects/ecommerce-api) backend project challenge.
