const Razorpay = require('razorpay');

let razorpayInstance = null;
let currentKeyId = null;

const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }

  if (!razorpayInstance || currentKeyId !== key_id) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
    currentKeyId = key_id;
  }

  return razorpayInstance;
};

module.exports = { getRazorpay };
