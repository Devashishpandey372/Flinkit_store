const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    shortDescription: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/400x400?text=Product',
    },
    images: {
      type: [String],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'out_of_stock'],
      default: 'available',
    },
    shopkeeper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    shopName: {
      type: String,
      trim: true,
      default: '',
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      // e.g., "500g", "1 kg", "1 L", "6 pcs"
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function (val) {
          if (this.originalPrice !== undefined) {
            return val <= this.originalPrice;
          }
          if (typeof this.getUpdate === 'function') {
            const update = this.getUpdate();
            const originalPrice = update?.originalPrice ?? update?.$set?.originalPrice;
            if (originalPrice !== undefined) {
              return val <= originalPrice;
            }
          }
          return true;
        },
        message: 'Selling price cannot be more than original price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [String],
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ sellingPrice: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ shopkeeper: 1, isActive: 1 });

// Ensure image & images consistency before save
productSchema.pre('save', function (next) {
  if (this.images && this.images.length > 0 && (!this.image || this.image.includes('placeholder'))) {
    this.image = this.images[0];
  } else if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }
  if (this.stock === 0 && !this.isModified('availabilityStatus')) {
    this.availabilityStatus = 'out_of_stock';
  }
  next();
});

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function () {
  if (this.originalPrice === 0) return 0;
  return Math.round(((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
