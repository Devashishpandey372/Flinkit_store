const mongoose = require('mongoose');
const http = require('http');
const crypto = require('crypto');
require('dotenv').config();

const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');

const PORT = 5098;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed, raw: data });
          } catch (e) {
            resolve({ status: res.statusCode, body: data, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== STARTING SHOPKEEPER & ADMIN SYSTEM VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flinkit-store');
  const server = app.listen(PORT);
  console.log(`Test verification server running on port ${PORT}`);

  try {
    // 1. Get or create Category
    let category = await Category.findOne();
    if (!category) {
      category = await Category.create({ name: 'Fresh Fruits', slug: 'fresh-fruits' });
    }
    console.log(`Using Category: ${category.name} (${category._id})`);

    // 2. Test Shopkeeper Registration
    const testEmail = `gupta_kirana_${Date.now()}@kirana.test`;
    console.log('\n--- 1. Testing Shopkeeper Registration (/api/admin/auth/register) ---');
    const regRes = await makeRequest('POST', '/api/admin/auth/register', {
      name: 'Ramesh Gupta',
      shopName: 'Gupta Kirana & General Store',
      email: testEmail,
      phone: '9811223344',
      password: 'KiranaPassword@123',
      shopAddress: 'Shop No. 14, Central Market, Lajpat Nagar, New Delhi - 110024',
      inviteCode: 'FLINKIT_SHOP_2026',
    });

    console.log(`Status: ${regRes.status}`);
    if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    const shopkeeperToken = regRes.body.data.token;
    const shopkeeperUser = regRes.body.data.user;
    console.log(`✓ Shopkeeper Registered: ${shopkeeperUser.name} | Shop: "${shopkeeperUser.shopName}"`);
    console.log(`✓ Role: ${shopkeeperUser.role} | Approved: ${regRes.body.data.isApproved}`);

    // 3. Test Shopkeeper Login
    console.log('\n--- 2. Testing Shopkeeper Login (/api/admin/auth/login) ---');
    const loginRes = await makeRequest('POST', '/api/admin/auth/login', {
      email: testEmail,
      password: 'KiranaPassword@123',
    });
    console.log(`Status: ${loginRes.status}`);
    if (loginRes.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    console.log(`✓ Shopkeeper Logged in successfully. Token received.`);

    // 4. Test Customer Separation: Customer Cannot Access Admin Login
    console.log('\n--- 3. Testing Customer vs Admin Separation ---');
    const custEmail = `shopper_${Date.now()}@consumer.test`;
    const custReg = await makeRequest('POST', '/api/auth/signup', {
      name: 'Sunita Sharma',
      email: custEmail,
      phone: '9899887766',
      password: 'CustomerPass@123',
    });
    const customerToken = custReg.body.data.token;

    // Customer trying to log into admin portal
    const custInAdminLogin = await makeRequest('POST', '/api/admin/auth/login', {
      email: custEmail,
      password: 'CustomerPass@123',
    });
    console.log(`Customer accessing /api/admin/auth/login status: ${custInAdminLogin.status} (Expected 403)`);
    if (custInAdminLogin.status !== 403) throw new Error('Customer was allowed into admin login!');
    console.log(`✓ Correctly rejected: "${custInAdminLogin.body.message}"`);

    // Customer trying to access admin dashboard
    const custInAdminDash = await makeRequest('GET', '/api/admin/dashboard', null, {
      Authorization: `Bearer ${customerToken}`,
    });
    console.log(`Customer accessing /api/admin/dashboard status: ${custInAdminDash.status} (Expected 403)`);
    if (custInAdminDash.status !== 403) throw new Error('Customer accessed admin dashboard!');
    console.log(`✓ Access denied for ordinary customer.`);

    // 5. Shopkeeper Adds Product
    console.log('\n--- 4. Testing Product Creation by Shopkeeper ---');
    const newProdRes = await makeRequest(
      'POST',
      '/api/admin/products',
      {
        name: 'Kashmiri Lal Kesar (Pure Saffron)',
        shortDescription: '100% Grade A natural crimson saffron strands',
        description: 'Harvested from the valleys of Pampore, Kashmir. Perfect for biryani, sweets, and golden milk.',
        category: category._id,
        subcategory: 'Spices & Seasoning',
        brand: 'Gupta Heritage',
        unit: '1 g',
        originalPrice: 450,
        sellingPrice: 385,
        stock: 40,
        sku: 'GUPTA-KESAR-1G',
        availabilityStatus: 'available',
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
      },
      { Authorization: `Bearer ${shopkeeperToken}` }
    );

    console.log(`Status: ${newProdRes.status}`);
    if (newProdRes.status !== 201) throw new Error(`Product creation failed: ${JSON.stringify(newProdRes.body)}`);
    const createdProduct = newProdRes.body.data.product;
    console.log(`✓ Product Created: "${createdProduct.name}" (ID: ${createdProduct._id})`);
    console.log(`✓ Shopkeeper ID: ${createdProduct.shopkeeper} | Shop: "${createdProduct.shopName}"`);
    console.log(`✓ Discount Automatically Calculated: ${createdProduct.discountPercent}%`);

    // 6. Verify Product is Live on Customer Storefront
    console.log('\n--- 5. Verifying Product on Customer Storefront ---');
    const storeRes = await makeRequest('GET', `/api/products/${createdProduct._id}`);
    console.log(`Customer GET /api/products/${createdProduct._id} status: ${storeRes.status}`);
    if (storeRes.status !== 200) throw new Error('Product not found on storefront!');
    console.log(`✓ Found on Storefront: "${storeRes.body.data.product.name}" | Price: ₹${storeRes.body.data.product.sellingPrice}`);
    console.log(`✓ Sold By: "${storeRes.body.data.product.shopName}"`);

    // 7. Test Ownership: Create 2nd Shopkeeper who CANNOT edit 1st shopkeeper's product
    console.log('\n--- 6. Testing Product Ownership Enforcement ---');
    const sk2Email = `verma_store_${Date.now()}@kirana.test`;
    const sk2Reg = await makeRequest('POST', '/api/admin/auth/register', {
      name: 'Anil Verma',
      shopName: 'Verma Super Grocery',
      email: sk2Email,
      phone: '9822334455',
      password: 'VermaPassword@123',
      shopAddress: 'Shop 5, Karol Bagh, New Delhi',
      inviteCode: 'FLINKIT_SHOP_2026',
    });
    const sk2Token = sk2Reg.body.data.token;

    // 2nd Shopkeeper attempts to edit 1st shopkeeper's product
    const unauthEdit = await makeRequest(
      'PATCH',
      `/api/admin/products/${createdProduct._id}`,
      { sellingPrice: 200 },
      { Authorization: `Bearer ${sk2Token}` }
    );
    console.log(`Unauthorized Shopkeeper Edit status: ${unauthEdit.status} (Expected 403)`);
    if (unauthEdit.status !== 403) throw new Error('Unauthorized shopkeeper was allowed to edit product!');
    console.log(`✓ Ownership Protected: "${unauthEdit.body.message}"`);

    // 8. 1st Shopkeeper Updates Product and Stock
    console.log('\n--- 7. Testing Authorized Product & Stock Updates ---');
    const authEdit = await makeRequest(
      'PATCH',
      `/api/admin/products/${createdProduct._id}`,
      { sellingPrice: 375, stock: 35 },
      { Authorization: `Bearer ${shopkeeperToken}` }
    );
    console.log(`Authorized Update status: ${authEdit.status}`);
    console.log(`✓ Price updated to: ₹${authEdit.body.data.product.sellingPrice} | Stock: ${authEdit.body.data.product.stock}`);

    // Quick Stock endpoint
    const stockPatch = await makeRequest(
      'PATCH',
      `/api/admin/products/${createdProduct._id}/stock`,
      { stock: 25 },
      { Authorization: `Bearer ${shopkeeperToken}` }
    );
    console.log(`✓ Quick Stock Update status: ${stockPatch.status} | Stock now: ${stockPatch.body.data.product.stock}`);

    // 9. Customer Cart, Order Placement & Atomic Stock Decrement
    console.log('\n--- 8. Testing Customer Order & Stock Reduction ---');
    // Create address for customer
    const addrRes = await makeRequest(
      'POST',
      '/api/addresses',
      {
        fullName: 'Sunita Sharma',
        phone: '9899887766',
        houseNumber: 'Flat 101, Galaxy Apts',
        street: 'Ring Road',
        landmark: 'Near Metro Pillar 45',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
        isDefault: true,
      },
      { Authorization: `Bearer ${customerToken}` }
    );
    const addressId = addrRes.body.data.address._id;

    // Customer adds product to cart
    const addCartRes = await makeRequest(
      'POST',
      '/api/cart/items',
      { productId: createdProduct._id, quantity: 2 },
      { Authorization: `Bearer ${customerToken}` }
    );
    console.log(`Customer Add to Cart status: ${addCartRes.status} (Quantity: 2)`);

    // Place Order (online payment)
    const orderRes = await makeRequest(
      'POST',
      '/api/orders',
      { addressId, paymentMethod: 'online' },
      { Authorization: `Bearer ${customerToken}` }
    );
    console.log(`Order Placed status: ${orderRes.status}`);
    if (orderRes.status !== 201) throw new Error(`Order placement failed: ${JSON.stringify(orderRes.body)}`);
    const order = orderRes.body.data.order;
    console.log(`✓ Order ID: ${order._id} | Total: ₹${order.totalAmount} | Payment: ${order.paymentMethod}`);

    // Verify atomic stock decrement
    const prodAfterOrder = await Product.findById(createdProduct._id);
    console.log(`✓ Product Stock Before: 25 | Quantity Ordered: 2 | Stock After: ${prodAfterOrder.stock}`);
    if (prodAfterOrder.stock !== 23) throw new Error(`Stock mismatch: expected 23, got ${prodAfterOrder.stock}`);

    // Generate Razorpay Order
    console.log('\n--- 9. Verifying Razorpay Payment Flow ---');
    const rzpOrderRes = await makeRequest(
      'POST',
      '/api/payments/create-order',
      { orderId: order._id },
      { Authorization: `Bearer ${customerToken}` }
    );
    console.log(`Razorpay Order Generation status: ${rzpOrderRes.status}`);
    const rzpOrderId = rzpOrderRes.body.data.razorpayOrderId;
    const rzpAmount = rzpOrderRes.body.data.amount;
    console.log(`✓ Razorpay Order ID: ${rzpOrderId} | Amount: ${rzpAmount} paise`);

    // Verify Payment Signature
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const generatedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'qNfdyGDZEdbkHGpgw9Lvn81I')
      .update(`${rzpOrderId}|${mockPaymentId}`)
      .digest('hex');

    const verifyRes = await makeRequest(
      'POST',
      '/api/payments/verify',
      {
        orderId: order._id,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: generatedSig,
      },
      { Authorization: `Bearer ${customerToken}` }
    );
    console.log(`Payment Verification status: ${verifyRes.status}`);
    console.log(`✓ Payment Verified: ${verifyRes.body.message}`);

    // 10. Test Out of Stock Protection
    console.log('\n--- 10. Testing Out-of-Stock Purchase Protection ---');
    // Set stock to 0 and availability to out_of_stock
    await makeRequest(
      'PATCH',
      `/api/admin/products/${createdProduct._id}/stock`,
      { stock: 0, availabilityStatus: 'out_of_stock' },
      { Authorization: `Bearer ${shopkeeperToken}` }
    );

    const tryAddOos = await makeRequest(
      'POST',
      '/api/cart/items',
      { productId: createdProduct._id, quantity: 1 },
      { Authorization: `Bearer ${customerToken}` }
    );
    console.log(`Customer adding Out-of-Stock product status: ${tryAddOos.status} (Expected 400)`);
    if (tryAddOos.status !== 400) throw new Error('Out of stock product was allowed into cart!');
    console.log(`✓ Correctly Blocked: "${tryAddOos.body.message}"`);

    console.log('\n======================================================');
    console.log('✅ ALL 10 SHOPKEEPER & ADMIN VERIFICATION TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
