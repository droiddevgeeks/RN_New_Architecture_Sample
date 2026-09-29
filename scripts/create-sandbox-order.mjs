#!/usr/bin/env node
// Dev-machine helper standing in for the merchant backend: creates a Cashfree
// SANDBOX order and prints order_id + payment_session_id to paste into the app.
// Credentials come from the environment and never enter the app bundle.
//
//   CASHFREE_CLIENT_ID=... CASHFREE_CLIENT_SECRET=... node scripts/create-sandbox-order.mjs [amount]

const clientId = process.env.CASHFREE_CLIENT_ID;
const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET (sandbox keys).');
  process.exit(1);
}

const amount = Number(process.argv[2] ?? '1');
if (!Number.isFinite(amount) || amount <= 0) {
  console.error('amount must be a positive number');
  process.exit(1);
}

const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-version': '2025-01-01',
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
  },
  body: JSON.stringify({
    order_id: `rn_newarch_${Date.now()}`,
    order_amount: amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: 'rn_newarch_sample',
      customer_phone: '9999999999',
      customer_email: 'sample@example.com',
    },
  }),
});

const text = await response.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  console.error(`Create order failed (${response.status}): non-JSON response: ${text.slice(0, 120)}`);
  process.exit(1);
}
if (!response.ok) {
  console.error(`Create order failed (${response.status}):`, body);
  process.exit(1);
}
console.log(JSON.stringify({order_id: body.order_id, payment_session_id: body.payment_session_id}, null, 2));
