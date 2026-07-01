import 'dotenv/config';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 4317);
const siteUrl = process.env.SITE_URL || `http://localhost:${port}`;
const useDemoData = String(process.env.RCM_USE_DEMO_DATA ?? 'true') === 'true';
const paymentProvider = (process.env.PAYMENT_PROVIDER || '').toLowerCase();
const pxpayUserId = process.env.PXPAY_USER_ID || '';
const pxpayKey = process.env.PXPAY_KEY || '';
const pxpayEndpoint = process.env.PXPAY_ENDPOINT || 'https://sec.windcave.com/pxaccess/pxpay.aspx';
const pxpayEnabled = Boolean(pxpayUserId && pxpayKey && !pxpayKey.includes('replace_me'));
const dataDir = path.join(process.cwd(), 'data');
const bookingsFile = path.join(dataDir, 'bookings.json');
const adminToken = process.env.ADMIN_TOKEN || '';
const businessEmail = process.env.BUSINESS_NOTIFICATION_EMAIL || '';
const openaiApiKey = process.env.OPENAI_API_KEY || '';
const aiAssistantModel = process.env.AI_ASSISTANT_MODEL || 'gpt-4.1-mini';
const openai = openaiApiKey && !openaiApiKey.includes('replace_me') ? new OpenAI({ apiKey: openaiApiKey }) : null;

const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  !process.env.SMTP_HOST.includes('replace_me')
);

const mailer = smtpConfigured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}) : null;

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

async function readBookings() {
  try {
    const data = await fs.readFile(bookingsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeBookings(bookings) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(bookingsFile, JSON.stringify(bookings, null, 2));
}

async function upsertBooking(bookingId, update) {
  const bookings = await readBookings();
  const index = bookings.findIndex((booking) => booking.bookingId === bookingId);
  const now = new Date().toISOString();
  const existing = index >= 0 ? bookings[index] : { bookingId, createdAt: now };
  const next = {
    ...existing,
    ...update,
    search: { ...(existing.search || {}), ...(update.search || {}) },
    vehicle: { ...(existing.vehicle || {}), ...(update.vehicle || {}) },
    customer: { ...(existing.customer || {}), ...(update.customer || {}) },
    payment: { ...(existing.payment || {}), ...(update.payment || {}) },
    bookingId,
    updatedAt: now
  };

  if (index >= 0) bookings[index] = next;
  else bookings.unshift(next);

  await writeBookings(bookings);
  return next;
}

async function getBooking(bookingId) {
  const bookings = await readBookings();
  return bookings.find((booking) => booking.bookingId === bookingId);
}

async function sendMail({ to, subject, text }) {
  if (!mailer || !to) return { skipped: true };
  return mailer.sendMail({
    from: process.env.SMTP_FROM || businessEmail || process.env.SMTP_USER,
    to,
    subject,
    text
  });
}

function bookingText(booking) {
  const customer = booking.customer || {};
  const search = booking.search || {};
  const vehicle = booking.vehicle || {};
  const payment = booking.payment || {};
  const formatDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '';
  };
  const extras = vehicle.optionalExtras?.length
    ? vehicle.optionalExtras.map((item) => `${item.name} x${item.qty}: NZD ${item.total}`).join('; ')
    : 'None';
  const insurance = vehicle.insurance
    ? `${vehicle.insurance.name}: NZD ${vehicle.insurance.total}, excess ${vehicle.insurance.excess}, bond ${vehicle.insurance.bond}`
    : 'Not selected';

  return [
    `Booking reference: ${booking.bookingId}`,
    `Status: ${booking.status}`,
    `Paid at: ${payment.paidAt || 'Not paid'}`,
    `Deposit paid: ${payment.deposit ? `NZD ${payment.deposit}` : 'Pending'}`,
    `Total: ${vehicle.total ? `NZD ${vehicle.total}` : 'Pending'}`,
    `Vehicle: ${vehicle.name || 'Vehicle pending'}`,
    `Dates: ${formatDate(search.pickupDate)} ${search.pickupTime || ''} - ${formatDate(search.returnDate)} ${search.returnTime || ''}`,
    `Route: ${search.pickupLocation || ''} to ${search.returnLocation || ''}`,
    `Over 21 confirmed: ${customer.over21Consent === 'yes' ? 'Yes' : 'No'}`,
    `Promo code: ${customer.promoCode || 'None'}`,
    `Insurance: ${insurance}`,
    `Optional extras: ${extras}`,
    `Customer: ${customer.name || ''}`,
    `Email: ${customer.email || ''}`,
    `Phone: ${customer.phone || ''}`,
    `Flight number: ${customer.flightNumber || 'None'}`,
    `Windcave Txn: ${payment.dpsTxnRef || payment.txnId || ''}`
  ].join('\n');
}

async function notifyDepositPaid(booking) {
  const customerEmail = booking.customer?.email;
  const ownerSubject = `Blue Rental deposit paid - ${booking.bookingId}`;
  const customerSubject = `Blue Rental deposit received - ${booking.bookingId}`;
  const ownerBody = `A customer has paid a booking deposit.\n\n${bookingText(booking)}`;
  const customerBody = [
    'Thank you. Your Blue Rental deposit has been received.',
    '',
    bookingText(booking),
    '',
    'Our team will confirm the remaining details before pick-up.'
  ].join('\n');

  await Promise.allSettled([
    sendMail({ to: businessEmail, subject: ownerSubject, text: ownerBody }),
    sendMail({ to: customerEmail, subject: customerSubject, text: customerBody })
  ]);
}

function requireAdmin(req, res, next) {
  if (!adminToken) {
    res.status(503).json({ error: 'ADMIN_TOKEN is not configured.' });
    return;
  }

  const token = req.get('x-admin-token') || req.query.token;
  if (token !== adminToken) {
    res.status(401).json({ error: 'Invalid admin token.' });
    return;
  }

  next();
}

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

function rentalDays(search = {}) {
  const pickup = new Date(`${search.pickupDate}T${search.pickupTime || '09:30'}`);
  const dropoff = new Date(`${search.returnDate}T${search.returnTime || '09:30'}`);
  const ms = dropoff - pickup;
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
  const days = rentalDays(search);
  const subtotal = vehicle.dailyRate * days;
  const fees = Math.round(subtotal * 0.08);
  const total = subtotal + fees;
  const depositPercent = Number(process.env.DEPOSIT_PERCENT || 10);
  const deposit = Math.round(total * depositPercent / 100);

  return { ...vehicle, days, subtotal, fees, total, deposit };
}

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlDecode(value = '') {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? xmlDecode(match[1].trim()) : '';
}

function xmlIsValid(xml) {
  return /valid=["']1["']/i.test(String(xml));
}

async function postPxpayXml(xml) {
  const response = await fetch(pxpayEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: xml
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`PxPay returned ${response.status}: ${text}`);
  return text;
}

async function createPxpayPayment({ bookingId, vehicleName, deposit, total, customerEmail }) {
  const amount = Number(deposit).toFixed(2);
  const currency = (process.env.PAYMENT_CURRENCY || 'NZD').toUpperCase();
  const txnId = `${bookingId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  const balance = Math.max(0, Number(total) - Number(deposit)).toFixed(2);
  const returnUrl = `${siteUrl}/payment/pxpay-result?booking=${encodeURIComponent(bookingId)}`;

  const requestXml = `<?xml version="1.0" encoding="utf-8"?>
<GenerateRequest>
  <PxPayUserId>${xmlEscape(pxpayUserId)}</PxPayUserId>
  <PxPayKey>${xmlEscape(pxpayKey)}</PxPayKey>
  <TxnType>Purchase</TxnType>
  <AmountInput>${xmlEscape(amount)}</AmountInput>
  <CurrencyInput>${xmlEscape(currency)}</CurrencyInput>
  <MerchantReference>${xmlEscape(bookingId)}</MerchantReference>
  <TxnId>${xmlEscape(txnId)}</TxnId>
  <EmailAddress>${xmlEscape(customerEmail || '')}</EmailAddress>
  <TxnData1>${xmlEscape(vehicleName || 'Blue Rental vehicle')}</TxnData1>
  <TxnData2>${xmlEscape(`Balance due on pickup: ${currency} ${balance}`)}</TxnData2>
  <UrlSuccess>${xmlEscape(returnUrl)}</UrlSuccess>
  <UrlFail>${xmlEscape(returnUrl)}</UrlFail>
</GenerateRequest>`;

  const resultXml = await postPxpayXml(requestXml);
  const uri = xmlTag(resultXml, 'URI');
  if (!xmlIsValid(resultXml) || !uri) {
    throw new Error(xmlTag(resultXml, 'ResponseText') || 'PxPay did not return a payment URL.');
  }

  return uri;
}

async function processPxpayResult(resultToken) {
  const requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ProcessResponse>
  <PxPayUserId>${xmlEscape(pxpayUserId)}</PxPayUserId>
  <PxPayKey>${xmlEscape(pxpayKey)}</PxPayKey>
  <Response>${xmlEscape(resultToken)}</Response>
</ProcessResponse>`;

  const resultXml = await postPxpayXml(requestXml);
  return {
    valid: xmlIsValid(resultXml),
    success: xmlTag(resultXml, 'Success') === '1',
    merchantReference: xmlTag(resultXml, 'MerchantReference'),
    txnId: xmlTag(resultXml, 'TxnId'),
    dpsTxnRef: xmlTag(resultXml, 'DpsTxnRef'),
    responseText: xmlTag(resultXml, 'ResponseText') || xmlTag(resultXml, 'HelpText')
  };
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
    await upsertBooking(bookingId, {
      source: rcmResult ? 'rcm' : 'demo',
      status: 'deposit_pending',
      search: booking.search,
      vehicle: booking.vehicle,
      customer: booking.customer
    });

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
  const provider = paymentProvider || (pxpayEnabled ? 'pxpay' : 'demo');

  if (provider === 'demo') {
    const paidAt = new Date().toISOString();
    const booking = await upsertBooking(bookingId, {
      status: 'deposit_paid_demo',
      payment: {
        provider: 'demo',
        deposit: Number(deposit),
        total: Number(total),
        paidAt
      }
    });
    await notifyDepositPaid(booking);

    res.json({
      mode: 'demo',
      checkoutUrl: `${siteUrl}/success.html?booking=${encodeURIComponent(bookingId)}&demo=true`
    });
    return;
  }

  if (provider !== 'pxpay') {
    res.status(400).json({ error: 'Unsupported payment provider. Use pxpay or demo.' });
    return;
  }

  if (!pxpayEnabled) {
    res.status(500).json({ error: 'PxPay is selected but PXPAY_USER_ID or PXPAY_KEY is missing.' });
    return;
  }

  try {
    await upsertBooking(bookingId, {
      status: 'payment_started',
      payment: {
        provider: 'pxpay',
        deposit: Number(deposit),
        total: Number(total),
        startedAt: new Date().toISOString(),
        customerEmail,
        vehicleName
      }
    });

    const checkoutUrl = await createPxpayPayment({ bookingId, vehicleName, deposit, total, customerEmail });
    res.json({ mode: 'pxpay', checkoutUrl });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/payment/pxpay-result', async (req, res) => {
  const bookingId = req.query.booking || 'Pending';
  const resultToken = req.query.result;

  if (!resultToken || !pxpayEnabled) {
    res.redirect(`/payment-failed.html?booking=${encodeURIComponent(bookingId)}&reason=${encodeURIComponent('Missing PxPay response')}`);
    return;
  }

  try {
    const result = await processPxpayResult(resultToken);
    const reference = result.merchantReference || bookingId;

    if (result.valid && result.success) {
      const booking = await upsertBooking(reference, {
        status: 'deposit_paid',
        payment: {
          provider: 'pxpay',
          paidAt: new Date().toISOString(),
          dpsTxnRef: result.dpsTxnRef,
          txnId: result.txnId,
          responseText: result.responseText
        }
      });
      await notifyDepositPaid(booking);

      res.redirect(`/success.html?booking=${encodeURIComponent(reference)}&provider=pxpay&txn=${encodeURIComponent(result.dpsTxnRef || result.txnId || '')}`);
      return;
    }

    await upsertBooking(reference, {
      status: 'payment_failed',
      payment: {
        provider: 'pxpay',
        failedAt: new Date().toISOString(),
        txnId: result.txnId,
        dpsTxnRef: result.dpsTxnRef,
        responseText: result.responseText || 'Payment was not approved'
      }
    });

    res.redirect(`/payment-failed.html?booking=${encodeURIComponent(reference)}&reason=${encodeURIComponent(result.responseText || 'Payment was not approved')}`);
  } catch (error) {
    await upsertBooking(bookingId, {
      status: 'payment_error',
      payment: {
        provider: 'pxpay',
        failedAt: new Date().toISOString(),
        responseText: error.message
      }
    });

    res.redirect(`/payment-failed.html?booking=${encodeURIComponent(bookingId)}&reason=${encodeURIComponent(error.message)}`);
  }
});

app.get('/api/payment-records', requireAdmin, async (req, res) => {
  const bookings = await readBookings();
  res.json({
    records: bookings
      .slice()
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  });
});

const assistantTopics = [
  {
    keys: ['airport', 'shuttle', 'chc', '机场', '接送', '穿梭'],
    en: 'Christchurch Airport bookings include a free shuttle between the airport and our Hornby branch. After booking, Blue Rental can confirm the exact pick-up instructions.',
    zh: '基督城机场订单可使用机场和 Hornby 门店之间的免费 shuttle 接送。完成预订后，Blue Rental 会确认具体接送说明。'
  },
  {
    keys: ['location', 'address', 'hornby', 'queenstown', 'zqn', '地点', '地址', '皇后镇', '门店'],
    en: 'Blue Rental is based at 249 Main South Rd, Hornby, Christchurch 8042. Queenstown Airport service is listed as coming soon.',
    zh: 'Blue Rental 门店位于 249 Main South Rd, Hornby, Christchurch 8042。皇后镇机场服务目前为 coming soon。'
  },
  {
    keys: ['hour', 'open', 'time', 'holiday', '营业', '时间', '假期'],
    en: 'Normal opening hours are 9.30am to 5pm. Public holiday surcharge may apply, so please confirm special-date bookings with the team.',
    zh: '正常营业时间为 9.30am-5pm。公共假期可能会有 surcharge，特殊日期建议和团队确认。'
  },
  {
    keys: ['insurance', 'cover', 'excess', 'bond', 'tyre', 'windshield', '保险', '垫底', '押金', '轮胎', '玻璃'],
    en: 'Blue Rental offers Standard, Smart and Elite cover options. Standard is NZ$0/day with higher excess and bond, Smart is NZ$20/day, and Elite is NZ$40/day with lower excess. Final eligibility is confirmed at booking or pick-up.',
    zh: 'Blue Rental 提供 Standard、Smart、Elite 三档保险。Standard 为 NZ$0/天但垫底费和预授权较高，Smart 为 NZ$20/天，Elite 为 NZ$40/天且垫底费更低。最终适用情况以预订或取车确认 为准。'
  },
  {
    keys: ['deposit', 'payment', 'pay', 'windcave', 'pxpay', '定金', '付款', '支付'],
    en: 'Online bookings can pay a 10% deposit through Windcave PxPay. The remaining balance can be paid at pick-up unless Blue Rental confirms otherwise.',
    zh: '线上预订可通过 Windcave PxPay 支付订单金额 10% 的定金。余款通常可在取车时支付，具体以 Blue Rental 确认为准。'
  },
  {
    keys: ['booking', 'book', 'reserve', 'reservation', 'rent a car', 'hire a car', '预订', '訂車', '订车', '租车', '租車', '我要租车'],
    en: 'You can start a booking on the Vehicles page by choosing pick-up location, drop-off location, date and time. After you choose a vehicle, enter your contact details and pay the 10% deposit to hold the car.',
    zh: '你可以在 Vehicles 页面开始预订：先选择取车/还车地点、日期和时间，再选择车辆，填写姓名、邮箱和电话，最后支付 10% 定金锁定车辆。'
  },
  {
    keys: ['vehicle', 'car', 'suv', '7 seater', 'aqua', 'vitz', '车型', '车辆', '七座', '租什么车'],
    en: 'Available categories include Super Eco, Eco Model, Compact, Intermediate, Wagon, Middle Size Sedan, 7 Seater, SUV and Luxury SUV. For final availability and price, please search dates on the Vehicles page.',
    zh: '车型类别包括 Super Eco、Eco Model、Compact、Intermediate、Wagon、Middle Size Sedan、7 Seater、SUV 和 Luxury SUV。最终库存和价格请在 Vehicles 页面输入日期查询。'
  },
  {
    keys: ['discount', '25', 'off', 'deal', '折扣', '优惠'],
    en: 'Online booking may enjoy up to 25% off. T&C apply, and the final discount depends on the booking details.',
    zh: '线上预订最高可享 25% off，T&C apply。最终折扣以具体订单条件为准。'
  },
  {
    keys: ['license', 'licence', 'driver', 'age', '驾照', '驾驶', '年龄'],
    en: 'Please bring a valid driver licence and any required translation or international driving permit. Age, licence and bond rules may depend on vehicle type and booking details.',
    zh: '取车时请携带有效驾照，以及需要的翻译件或国际驾照。年龄、驾照和押金要求可能因车型和订单情况不同。'
  },
  {
    keys: ['contact', 'phone', 'email', 'call', '联系', '电话', '邮箱', '人工'],
    en: 'You can contact Blue Rental at 03 281 8858 or info@bluerental.co.nz. For booking-specific questions, please include your booking reference if you have one.',
    zh: '你可以通过 03 281 8858 或 info@bluerental.co.nz 联系 Blue Rental。如咨询已有订单，请附上 booking reference。'
  }
];

const assistantKnowledge = `
Blue Rental business information:
- Blue Rental is a Christchurch, New Zealand car rental company.
- Main branch: 249 Main South Rd, Hornby, Christchurch 8042, New Zealand.
- Christchurch Airport bookings can use a free shuttle between the airport and the Hornby branch.
- Queenstown Airport service is coming soon.
- Opening hours: 9.30am to 5pm. Public holiday surcharge may apply.
- Phone: 03 281 8858.
- Email: info@bluerental.co.nz.
- Online bookings may enjoy up to 25% off. T&C apply.
- Vehicle categories: Super Eco, Eco Model, Compact, Intermediate, Wagon, Middle Size Sedan, 7 Seater, SUV, Luxury SUV.
- Example vehicles include Toyota Vitz, Toyota Spade, Toyota Aqua, Toyota Corolla Hatch, Corolla Fielder, Toyota Camry, Toyota Vellfire, Mazda CX-5 and Audi Q7 or similar.
- Online deposit: customers can pay 10% deposit through Windcave PxPay. The remaining balance can be paid at pick-up unless Blue Rental confirms otherwise.
- Insurance options:
  Standard Cover: NZ$0/day, collision damage excess NZ$4,000, bond NZ$2,000, roadside assistance not included, windshield chip cover not included, tyre cover not included, third-party liability excess NZ$4,000.
  Smart Cover: NZ$20/day, collision damage excess NZ$2,000, bond NZ$1,000, roadside assistance included, windshield chip cover included, tyre cover not included, third-party liability excess NZ$4,000.
  Elite Cover: NZ$40/day, collision damage excess NZ$500, bond NZ$500, roadside assistance included, windshield chip cover included, tyre cover included.
- International drivers: Elite Cover may cost 1.5 times the standard rate due to higher risk.
- Exclusions: negligence, intentional actions, breach of rental agreement and unlawful driving are not covered.
- Customers should bring a valid driver licence and any required translation or international driving permit.
- For real-time availability, final prices, booking-specific questions, refunds, cancellations or final insurance eligibility, ask the customer to contact Blue Rental or use the booking form.
`;

function assistantReply(message = '', language = '') {
  const text = String(message).toLowerCase();
  const wantsChinese = language === 'zh' || /[\u3400-\u9fff]/.test(message);
  const topic = assistantTopics.find((item) => item.keys.some((key) => text.includes(key.toLowerCase())));

  if (topic) return wantsChinese ? topic.zh : topic.en;

  return wantsChinese
    ? '我可以回答 Blue Rental 的取还车、机场 shuttle、车型、保险、定金和营业时间等常见问题。如果是具体订单或实时库存，请联系 03 281 8858 或 info@bluerental.co.nz。'
    : 'I can help with Blue Rental pick-up, airport shuttle, vehicles, insurance, deposit payment and opening-hours questions. For booking-specific details or live availability, please contact 03 281 8858 or info@bluerental.co.nz.';
}

async function aiAssistantReply(message = '', language = '') {
  if (!openai) return assistantReply(message, language);

  const wantsChinese = language === 'zh' || /[\u3400-\u9fff]/.test(message);
  const outputLanguage = wantsChinese ? 'Chinese' : 'English';
  const fallback = assistantReply(message, language);

  const response = await Promise.race([
    openai.responses.create({
      model: aiAssistantModel,
      input: [
        {
          role: 'system',
          content: [
            `You are Blue Rental Assistant, a helpful website chat assistant for a New Zealand car rental company.`,
            `Answer in ${outputLanguage}. Be friendly, concise, and practical.`,
            `Use only the business information below. Do not invent live availability, final prices, refunds, policy exceptions, or booking status.`,
            `If the question requires a booking-specific answer, live inventory, final eligibility, or anything not in the knowledge base, say that Blue Rental should confirm it and provide phone/email.`,
            `Never ask for full credit card details or sensitive passwords in chat.`,
            assistantKnowledge,
            `If the user's question is unrelated to car rental or Blue Rental, politely redirect them to Blue Rental rental questions.`
          ].join('\n')
        },
        {
          role: 'user',
          content: String(message).slice(0, 1000)
        }
      ],
      max_output_tokens: 260
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI assistant timeout')), 9000))
  ]);

  return response.output_text?.trim() || fallback;
}

app.get('/api/chat-status', (req, res) => {
  res.json({
    aiConfigured: Boolean(openai),
    mode: openai ? 'ai' : 'faq',
    model: openai ? aiAssistantModel : null
  });
});

app.post('/api/chat', async (req, res) => {
  const message = req.body?.message || '';
  const language = req.body?.language || '';
  try {
    res.json({
      mode: openai ? 'ai' : 'faq',
      reply: await aiAssistantReply(message, language)
    });
  } catch (error) {
    console.error('AI assistant failed:', error.message);
    res.json({
      mode: 'faq',
      reply: assistantReply(message, language)
    });
  }
});

app.listen(port, () => {
  console.log(`Rental site running at ${siteUrl}`);
});
