import { Link } from 'react-router-dom';

const CategoryCard = ({ category }) => {
  return (
    <Link
      to={`/products?category=${category.slug}`}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white hover:bg-primary-50 border border-gray-100 hover:border-primary-200 transition-all duration-200 hover:shadow-md"
      id={`category-card-${category.slug}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          loading="lazy"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'; }}
        />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-primary-700 text-center leading-tight transition-colors">
        {category.name}
      </p>
    </Link>
  );
};

export default CategoryCard;
