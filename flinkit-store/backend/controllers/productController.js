const Product = require('../models/Product');
const Category = require('../models/Category');
const slugify = require('slugify');

/**
 * GET /api/products
 * Query params: category, search, sort, minPrice, maxPrice, page, limit, featured
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      sort = 'createdAt',
      order = 'desc',
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      featured,
    } = req.query;

    const filter = { isActive: true };

    if (category) {
      // Accept category slug or id
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
      else filter.category = category; // Try as ObjectId
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.sellingPrice = {};
      if (minPrice !== undefined) filter.sellingPrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.sellingPrice.$lte = Number(maxPrice);
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    const sortObj = {};
    const allowedSorts = ['sellingPrice', 'originalPrice', 'createdAt', 'name'];
    if (allowedSorts.includes(sort)) {
      sortObj[sort] = order === 'asc' ? 1 : -1;
    } else {
      sortObj.createdAt = -1;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug image')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/search
 */
const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const products = await Product.find({
      isActive: true,
      $text: { $search: q.trim() },
    })
      .populate('category', 'name slug')
      .sort({ score: { $meta: 'textScore' } })
      .limit(30)
      .lean({ virtuals: true });

    return res.status(200).json({ success: true, data: { products } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isActive: true,
    })
      .populate('category', 'name slug image')
      .lean({ virtuals: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.status(200).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, searchProducts, getProductById };
