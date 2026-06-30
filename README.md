# Blue Rental booking website

Blue Rental booking website prototype with:

- Blue Rental homepage, vehicle page, insurance page and booking flow
- Express backend for keeping RCM and payment credentials server-side
- Demo inventory mode for previewing without live RCM credentials
- Windcave PxPay hosted payment page for online deposit collection
- Rental Car Manager adapter points in `server.mjs`

## Run locally

```powershell
Copy-Item .env.example .env
pnpm install
pnpm start
```

Open:

```text
http://localhost:4317
```

## Windcave PxPay deposit payment

Set these in `.env` locally, or in Render Environment Variables for production:

```text
PAYMENT_PROVIDER=pxpay
PXPAY_USER_ID=BlueRental_HPP
PXPAY_KEY=your_full_pxpay_key2
PXPAY_ENDPOINT=https://sec.windcave.com/pxaccess/pxpay.aspx
DEPOSIT_PERCENT=10
PAYMENT_CURRENCY=NZD
SITE_URL=https://your-render-service.onrender.com
```

Keep `PXPAY_KEY` secret. Do not commit it to GitHub.

For local preview without real payment:

```text
PAYMENT_PROVIDER=demo
```

When a payment completes, the app records the booking and payment status in `data/bookings.json`.
The `data/` folder is ignored by Git so customer details are not committed.

To view records online, open:

```text
/admin-payments.html
```

Set an admin token in Render and use it on that page:

```text
ADMIN_TOKEN=choose_a_private_password
```

## Email notifications

Email is optional. If SMTP details are configured, the app sends:

- a notification email to Blue Rental
- a deposit received email to the customer

Render environment variables:

```text
BUSINESS_NOTIFICATION_EMAIL=info@bluerental.co.nz
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=Blue Rental <info@bluerental.co.nz>
```

If SMTP is not configured, bookings and payment status are still recorded, but no email is sent.

## Rental Car Manager

Set RCM sandbox/live details and disable demo data:

```text
RCM_API_BASE_URL=https://apis.rentalcarmanager.com
RCM_API_KEY=your_key
RCM_SECRET=your_secret
RCM_USE_DEMO_DATA=false
```

Current adapter points:

- `POST /api/availability`
- `POST /api/bookings`
- `POST /api/pay-deposit`
- `GET /payment/pxpay-result`

## Render

Use:

```text
Build Command: npm install
Start Command: npm start
Runtime: Node
Branch: main
```

Minimum environment variables:

```text
NODE_VERSION=20
PAYMENT_PROVIDER=pxpay
PXPAY_USER_ID=BlueRental_HPP
PXPAY_KEY=your_full_pxpay_key2
PXPAY_ENDPOINT=https://sec.windcave.com/pxaccess/pxpay.aspx
DEPOSIT_PERCENT=10
PAYMENT_CURRENCY=NZD
ADMIN_TOKEN=choose_a_private_password
BUSINESS_NOTIFICATION_EMAIL=info@bluerental.co.nz
RCM_USE_DEMO_DATA=true
SITE_URL=https://your-render-service.onrender.com
```
