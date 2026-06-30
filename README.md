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
RCM_USE_DEMO_DATA=true
SITE_URL=https://your-render-service.onrender.com
```
