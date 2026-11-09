/**
 * Product & Category seed script
 * Usage: npm run seed (from root) or node database/seed/seedProducts.js
 */

const path = require('path');
module.paths.push(path.resolve(__dirname, '../../backend/node_modules'));
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const mongoose = require('mongoose');
const Category = require('../../backend/models/Category');
const Product = require('../../backend/models/Product');

const categories = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400', description: 'Fresh farm-to-table produce', sortOrder: 1 },
  { name: 'Dairy, Bread & Eggs', slug: 'dairy-bread-eggs', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', description: 'Fresh dairy products and bakery', sortOrder: 2 },
  { name: 'Snacks & Munchies', slug: 'snacks-munchies', image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400', description: 'Chips, namkeen and more', sortOrder: 3 },
  { name: 'Cold Drinks & Juices', slug: 'cold-drinks-juices', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', description: 'Refreshing beverages', sortOrder: 4 },
  { name: 'Atta, Rice & Dal', slug: 'atta-rice-dal', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', description: 'Kitchen staples', sortOrder: 5 },
  { name: 'Personal Care', slug: 'personal-care', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', description: 'Hygiene and grooming essentials', sortOrder: 6 },
  { name: 'Household Essentials', slug: 'household-essentials', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', description: 'Cleaning and home supplies', sortOrder: 7 },
  { name: 'Bakery & Biscuits', slug: 'bakery-biscuits', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', description: 'Biscuits, cookies and baked goods', sortOrder: 8 },
];

const getProducts = (catMap) => [
  // Fruits & Vegetables
  { name: 'Fresh Bananas', slug: 'fresh-bananas', description: 'Sweet and ripe bananas, perfect for snacking and smoothies.', category: catMap['fruits-vegetables'], image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', unit: '6 pcs', originalPrice: 60, sellingPrice: 49, stock: 150, isFeatured: true, tags: ['fruit', 'fresh', 'banana'] },
  { name: 'Red Tomatoes', slug: 'red-tomatoes', description: 'Farm-fresh red tomatoes, rich in lycopene and antioxidants.', category: catMap['fruits-vegetables'], image: 'https://images.unsplash.com/photo-1546094096-0df4bcabd5af?w=400', unit: '500 g', originalPrice: 40, sellingPrice: 35, stock: 200, isFeatured: false, tags: ['vegetable', 'tomato'] },
  { name: 'Organic Spinach', slug: 'organic-spinach', description: 'Fresh organic baby spinach leaves, pesticide free.', category: catMap['fruits-vegetables'], image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', unit: '200 g', originalPrice: 45, sellingPrice: 39, stock: 80, isFeatured: false, tags: ['vegetable', 'organic', 'spinach'] },
  { name: 'Royal Gala Apples', slug: 'royal-gala-apples', description: 'Crisp and sweet Royal Gala apples imported from Himachal Pradesh.', category: catMap['fruits-vegetables'], image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400', unit: '4 pcs (~500 g)', originalPrice: 120, sellingPrice: 99, stock: 60, isFeatured: true, tags: ['fruit', 'apple'] },
  { name: 'Yellow Onions', slug: 'yellow-onions', description: 'Premium quality yellow onions for everyday cooking.', category: catMap['fruits-vegetables'], image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400', unit: '1 kg', originalPrice: 55, sellingPrice: 45, stock: 300, isFeatured: false, tags: ['vegetable', 'onion'] },
  { name: 'Fresh Carrots', slug: 'fresh-carrots', description: 'Crunchy fresh carrots, great for salads and cooking.', category: catMap['fruits-vegetables'], image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', unit: '500 g', originalPrice: 35, sellingPrice: 29, stock: 120, isFeatured: false, tags: ['vegetable', 'carrot'] },

  // Dairy, Bread & Eggs
  { name: 'Amul Full Cream Milk', slug: 'amul-full-cream-milk', description: 'Pasteurized and homogenized full cream milk.', category: catMap['dairy-bread-eggs'], image: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=400', unit: '1 L', originalPrice: 68, sellingPrice: 65, stock: 200, isFeatured: true, tags: ['dairy', 'milk', 'amul'] },
  { name: 'Farm Fresh Eggs', slug: 'farm-fresh-eggs', description: 'Free-range farm fresh eggs, rich in protein.', category: catMap['dairy-bread-eggs'], image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', unit: '12 pcs', originalPrice: 90, sellingPrice: 79, stock: 150, isFeatured: true, tags: ['egg', 'protein'] },
  { name: 'Britannia Brown Bread', slug: 'britannia-brown-bread', description: 'Whole wheat brown bread, high in fibre and nutrients.', category: catMap['dairy-bread-eggs'], image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=400', unit: '400 g', originalPrice: 48, sellingPrice: 42, stock: 90, isFeatured: false, tags: ['bread', 'britannia'] },
  { name: 'Amul Butter', slug: 'amul-butter', description: 'Creamy and rich Amul salted butter.', category: catMap['dairy-bread-eggs'], image: 'https://images.unsplash.com/photo-1589985270958-bf087b7ee45d?w=400', unit: '500 g', originalPrice: 250, sellingPrice: 235, stock: 80, isFeatured: false, tags: ['dairy', 'butter', 'amul'] },
  { name: 'Nestle Dahi', slug: 'nestle-dahi', description: 'Fresh and thick set curd, probiotic rich.', category: catMap['dairy-bread-eggs'], image: 'https://images.unsplash.com/photo-1563208723-cb2f5e6fd5f8?w=400', unit: '400 g', originalPrice: 55, sellingPrice: 49, stock: 100, isFeatured: false, tags: ['dairy', 'curd', 'nestle'] },

  // Snacks & Munchies
  { name: 'Lay\'s Classic Salted', slug: 'lays-classic-salted', description: 'Irresistible classic salted potato chips.', category: catMap['snacks-munchies'], image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', unit: '73 g', originalPrice: 30, sellingPrice: 30, stock: 500, isFeatured: true, tags: ['chips', 'lays', 'snack'] },
  { name: 'Haldiram\'s Aloo Bhujia', slug: 'haldirams-aloo-bhujia', description: 'Crispy and spicy Aloo Bhujia from Haldirams.', category: catMap['snacks-munchies'], image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400', unit: '200 g', originalPrice: 80, sellingPrice: 72, stock: 200, isFeatured: true, tags: ['namkeen', 'haldirams'] },
  { name: 'Kurkure Masala Munch', slug: 'kurkure-masala-munch', description: 'Crunchy corn puffs with chatpata masala flavour.', category: catMap['snacks-munchies'], image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', unit: '90 g', originalPrice: 30, sellingPrice: 28, stock: 400, isFeatured: false, tags: ['snack', 'kurkure'] },
  { name: 'Maggi Masala Noodles', slug: 'maggi-masala-noodles', description: '2-minute noodles with classic masala tastemaker.', category: catMap['snacks-munchies'], image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400', unit: '4 × 70 g', originalPrice: 72, sellingPrice: 65, stock: 300, isFeatured: true, tags: ['noodles', 'maggi', 'instant'] },

  // Cold Drinks & Juices
  { name: 'Coca-Cola', slug: 'coca-cola-500ml', description: 'Refreshing Coca-Cola carbonated soft drink.', category: catMap['cold-drinks-juices'], image: 'https://images.unsplash.com/photo-1629203849820-8c2f8c1bbdea?w=400', unit: '500 ml', originalPrice: 40, sellingPrice: 38, stock: 500, isFeatured: true, tags: ['cola', 'carbonated', 'drink'] },
  { name: 'Real Fruit Juice - Orange', slug: 'real-fruit-juice-orange', description: 'Tropicana Real fruit juice with no added sugar.', category: catMap['cold-drinks-juices'], image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', unit: '1 L', originalPrice: 99, sellingPrice: 89, stock: 150, isFeatured: false, tags: ['juice', 'orange', 'real'] },
  { name: 'Bisleri Mineral Water', slug: 'bisleri-mineral-water', description: 'Pure and safe packaged drinking water.', category: catMap['cold-drinks-juices'], image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', unit: '1 L', originalPrice: 20, sellingPrice: 20, stock: 1000, isFeatured: false, tags: ['water', 'bisleri'] },
  { name: 'Sprite Lemon & Lime', slug: 'sprite-lemon-lime', description: 'Crisp and refreshing lemon-lime flavoured drink.', category: catMap['cold-drinks-juices'], image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400', unit: '500 ml', originalPrice: 40, sellingPrice: 38, stock: 400, isFeatured: false, tags: ['sprite', 'carbonated'] },

  // Atta, Rice & Dal
  { name: 'Aashirvaad Whole Wheat Atta', slug: 'aashirvaad-whole-wheat-atta', description: 'Nutritious whole wheat atta for soft and fluffy rotis.', category: catMap['atta-rice-dal'], image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', unit: '5 kg', originalPrice: 280, sellingPrice: 249, stock: 100, isFeatured: true, tags: ['atta', 'wheat', 'aashirvaad'] },
  { name: 'India Gate Basmati Rice', slug: 'india-gate-basmati-rice', description: 'Premium aged long grain basmati rice.', category: catMap['atta-rice-dal'], image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', unit: '5 kg', originalPrice: 450, sellingPrice: 399, stock: 80, isFeatured: true, tags: ['rice', 'basmati', 'india gate'] },
  { name: 'Tata Sampann Chana Dal', slug: 'tata-sampann-chana-dal', description: 'Premium quality chana dal, rich in protein and fibre.', category: catMap['atta-rice-dal'], image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', unit: '1 kg', originalPrice: 120, sellingPrice: 109, stock: 150, isFeatured: false, tags: ['dal', 'chana', 'tata'] },

  // Personal Care
  { name: 'Dove Body Soap', slug: 'dove-body-soap', description: 'Moisturising cream beauty soap for soft skin.', category: catMap['personal-care'], image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400', unit: '4 × 100 g', originalPrice: 180, sellingPrice: 159, stock: 200, isFeatured: false, tags: ['soap', 'dove', 'bath'] },
  { name: 'Colgate Total Toothpaste', slug: 'colgate-total-toothpaste', description: '12-hour germ protection toothpaste.', category: catMap['personal-care'], image: 'https://images.unsplash.com/photo-1559591937-abc661c5b2ed?w=400', unit: '150 g', originalPrice: 130, sellingPrice: 119, stock: 300, isFeatured: false, tags: ['toothpaste', 'colgate', 'oral care'] },
  { name: 'Head & Shoulders Shampoo', slug: 'head-shoulders-shampoo', description: 'Anti-dandruff shampoo for clean healthy hair.', category: catMap['personal-care'], image: 'https://images.unsplash.com/photo-1585232351009-aa87416fca30?w=400', unit: '340 ml', originalPrice: 270, sellingPrice: 249, stock: 120, isFeatured: false, tags: ['shampoo', 'hair care', 'anti-dandruff'] },

  // Household Essentials
  { name: 'Surf Excel Liquid Detergent', slug: 'surf-excel-liquid-detergent', description: 'Powerful stain-removing liquid detergent.', category: catMap['household-essentials'], image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', unit: '1 L', originalPrice: 199, sellingPrice: 179, stock: 150, isFeatured: false, tags: ['detergent', 'surf excel', 'laundry'] },
  { name: 'Vim Dishwash Bar', slug: 'vim-dishwash-bar', description: 'Effective grease-cutting dishwash bar.', category: catMap['household-essentials'], image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', unit: '155 g × 3', originalPrice: 75, sellingPrice: 68, stock: 200, isFeatured: false, tags: ['dishwash', 'vim', 'cleaning'] },
  { name: 'Harpic Toilet Cleaner', slug: 'harpic-toilet-cleaner', description: 'Powerful toilet cleaner and disinfectant.', category: catMap['household-essentials'], image: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400', unit: '1 L', originalPrice: 149, sellingPrice: 135, stock: 180, isFeatured: false, tags: ['toilet cleaner', 'harpic'] },

  // Bakery & Biscuits
  { name: 'Parle-G Glucose Biscuits', slug: 'parle-g-glucose-biscuits', description: 'India\'s most loved glucose biscuit.', category: catMap['bakery-biscuits'], image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', unit: '799 g', originalPrice: 80, sellingPrice: 75, stock: 500, isFeatured: true, tags: ['biscuit', 'parle-g', 'glucose'] },
  { name: 'Good Day Butter Biscuits', slug: 'good-day-butter-biscuits', description: 'Crispy butter cookies with a rich flavour.', category: catMap['bakery-biscuits'], image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', unit: '200 g', originalPrice: 50, sellingPrice: 45, stock: 300, isFeatured: false, tags: ['biscuit', 'butter', 'good day'] },
  { name: 'Britannia Cake', slug: 'britannia-cake', description: 'Soft and moist vanilla flavoured cake slices.', category: catMap['bakery-biscuits'], image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', unit: '250 g', originalPrice: 65, sellingPrice: 58, stock: 120, isFeatured: false, tags: ['cake', 'britannia', 'bakery'] },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Upsert categories
    const catMap = {};
    for (const cat of categories) {
      const upserted = await Category.findOneAndUpdate(
        { slug: cat.slug },
        cat,
        { upsert: true, new: true }
      );
      catMap[cat.slug] = upserted._id;
    }
    console.log(`✅ Seeded ${categories.length} categories`);

    // Upsert products
    const products = getProducts(catMap);
    for (const prod of products) {
      await Product.findOneAndUpdate(
        { slug: prod.slug },
        prod,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${products.length} products`);

    console.log('\n🎉 Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
