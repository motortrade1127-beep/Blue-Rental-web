import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import Stripe from 'stripe';

const app = express();
const port = Number(process.env.PORT || 4317);
const siteUrl = process.env.SITE_URL || `http://localhost:${port}`;
const useDemoData = String(process.env.RCM_USE_DEMO_DATA ?? 'true') === 'true';
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret && !stripeSecret.includes('replace_me') ? new Stripe(stripeSecret) : null;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.static('public'));

const demoFleet = [
  {
    id: 'budget-vitz',
    name: 'Toyota Vitz or similar',
    category: 'Super Eco',
    seats: 5,
    bags: 1,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 35,
    image: 'assets/vehicles/toyota-vitz-white.png',
    badge: 'From $35 NZD/day',
    years: '2012-2018',
    description: 'A compact and fuel-efficient car, ideal for city driving and budget-conscious travellers.'
  },
  {
    id: 'eco-spade',
    name: 'Toyota Spade or similar',
    category: 'Eco Model',
    seats: 5,
    bags: 1,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 60,
    image: 'assets/vehicles/toyota-spade-white.png',
    badge: 'Sliding door',
    years: '2013-2014',
    description: 'Compact yet spacious, with easy access and excellent fuel efficiency for small families.'
  },
  {
    id: 'compact-aqua',
    name: 'Toyota Aqua or similar',
    category: 'Compact',
    seats: 5,
    bags: 1,
    transmission: 'Automatic',
    fuel: 'Hybrid',
    dailyRate: 65,
    image: 'assets/vehicles/toyota-aqua-white.png',
    badge: 'Hybrid',
    years: '2012-2018',
    description: 'A hybrid compact with outstanding economy around 3.9L/100km for South Island trips.'
  },
  {
    id: 'intermediate-corolla',
    name: 'Toyota Corolla Hatch or similar',
    category: 'Intermediate',
    seats: 5,
    bags: 2,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 85,
    image: 'assets/vehicles/toyota-corolla-hatch-white.png',
    badge: 'Comfort',
    years: '2012-2018',
    description: 'A practical hatchback for longer drives, extra comfort and easy luggage loading.'
  },
  {
    id: 'wagon-fielder',
    name: 'Corolla Fielder or similar',
    category: 'Wagon',
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 85,
    image: 'assets/vehicles/corolla-fielder-white.png',
    badge: 'Extra luggage',
    years: '2012-2018',
    description: 'A wagon option for travellers who want more room for bags, golf clubs or family gear.'
  },
  {
    id: 'sedan-camry',
    name: 'Toyota Camry or similar',
    category: 'Middle Size Sedan',
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 90,
    image: 'assets/vehicles/toyota-camry-white.png',
    badge: 'Business',
    years: '2012-2018',
    description: 'A smooth sedan for business use, airport transfers and comfortable open-road driving.'
  },
  {
    id: 'seven-seater-vellfire',
    name: 'Toyota Vellfire or similar',
    category: '7 Seater',
    seats: 7,
    bags: 2,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 120,
    image: 'assets/vehicles/toyota-vellfire-white.png',
    badge: 'Group travel',
    years: '2012-2018',
    description: 'A spacious people mover for families and groups exploring Christchurch and beyond.'
  },
  {
    id: 'suv-cx5',
    name: 'Mazda CX-5 or similar',
    category: 'SUV',
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 120,
    image: 'assets/vehicles/mazda-cx5-white.png',
    badge: 'SUV',
    years: '2012-2018',
    description: 'A versatile SUV for longer road trips, family travel and comfortable touring.'
  },
  {
    id: 'luxury-suv-q7',
    name: 'Audi Q7 or similar',
    category: 'Luxury SUV',
    seats: 7,
    bags: 4,
    transmission: 'Automatic',
    fuel: 'Petrol',
    dailyRate: 250,
    image: 'assets/vehicles/audi-q7-white.png',
    badge: 'Premium',
    years: '2012-2018',
    description: 'A premium SUV option for executive travel, larger groups and extra luggage capacity.'
  }
];

function daysBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.ceil(ms / 86400000));
}

function signedHeaders(path, body) {
  const apiKey = process.env.RCM_API_KEY || '';
  const secret = process.env.RCM_SECRET || '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${path}.${JSON.stringify(body || {})}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    'Content-Type': 'application/json',
    'X-RCM-ApiKey': apiKey,
    'X-RCM-Timestamp': timestamp,
    'X-RCM-Signature': signature
  };
}

async function callRcm(path, body) {
  const baseUrl = (process.env.RCM_API_BASE_URL || '').replace(/\/$/, '');
  if (!baseUrl || useDemoData) return null;

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: signedHeaders(path, body),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`RCM API returned ${response.status}: ${message}`);
  }

  return response.json();
}

function quoteVehicle(vehicle, search) {
  const days = daysBetween(search.pickupDate, search.returnDate);
  const subtotal = vehicle.dailyRate * days;
  const fees = Math.round(subtotal * 0.08);
  const total = subtotal + fees;
  const depositPercent = Number(process.env.STRIPE_DEPOSIT_PERCENT || 10);
  const deposit = Math.round(total * depositPercent / 100);

  return { ...vehicle, days, subtotal, fees, total, deposit };
}

app.post('/api/availability', async (req, res) => {
  try {
    const search = req.body;
    const rcmResult = await callRcm('/v3.2/availability', search);

    if (rcmResult?.vehicles) {
      res.json({ source: 'rcm', vehicles: rcmResult.vehicles });
      return;
    }

    res.json({
      source: 'demo',
      vehicles: demoFleet.map((vehicle) => quoteVehicle(vehicle, search))
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = req.body;
    const rcmResult = await callRcm('/v3.2/bookings', booking);

    const bookingId = rcmResult?.bookingId || `BLU-${Date.now().toString().slice(-6)}`;
    res.json({
      bookingId,
      source: rcmResult ? 'rcm' : 'demo',
      status: 'deposit_pending'
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/pay-deposit', async (req, res) => {
  const { bookingId, vehicleName, deposit, total, customerEmail } = req.body;

  if (!stripe) {
    res.json({
      mode: 'demo',
      checkoutUrl: `${siteUrl}/success.html?booking=${encodeURIComponent(bookingId)}&demo=true`
    });
    return;
  }

  try {
    const currency = (process.env.STRIPE_CURRENCY || 'nzd').toLowerCase();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(Number(deposit) * 100),
            product_data: {
              name: `Deposit for ${vehicleName}`,
              description: `Booking ${bookingId}. Balance due on pickup: ${currency.toUpperCase()} ${Math.max(0, Number(total) - Number(deposit)).toFixed(2)}`
            }
          }
        }
      ],
      metadata: {
        bookingId,
        total: String(total),
        deposit: String(deposit)
      },
      success_url: `${siteUrl}/success.html?booking=${encodeURIComponent(bookingId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?payment=cancelled&booking=${encodeURIComponent(bookingId)}`
    });

    res.json({ mode: 'stripe', checkoutUrl: session.url });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Rental site running at ${siteUrl}`);
});
