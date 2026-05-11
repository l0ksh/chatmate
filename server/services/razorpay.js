import crypto from 'crypto';
import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing. Payment routes will fail until configured.');
}

const razorpay = new Razorpay({
  key_id: keyId || '',
  key_secret: keySecret || '',
});

export async function createRazorpayOrder({ amount, receipt, notes }) {
  return razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt,
    notes,
  });
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', keySecret || '')
    .update(payload)
    .digest('hex');

  return expected === signature;
}
