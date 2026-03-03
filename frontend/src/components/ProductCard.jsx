import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";

export default function ProductCard({ product }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const isInStock = (product.stock_count || 0) > 0;
  
  // Get first image from comma-separated main_image
  const getFirstImage = () => {
    if (product.main_image) {
      const firstImage = product.main_image.split(',')[0]?.trim();
      return firstImage || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80";
    }
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80";
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="product-card block glass-card rounded-2xl overflow-hidden group"
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div className="aspect-[4/3] overflow-hidden relative bg-zinc-900">
        <img
          src={product.main_image}
          alt={product.product_name}
          className="product-image w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80";
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Condition Badge */}
          <Badge
            data-testid={`condition-badge-${product.id}`}
            className={`${
              product.condition === "New"
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
            } px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm`}
          >
            {product.condition}
          </Badge>
        </div>

        {/* Stock Badge - Top Right */}
        <div className="absolute top-3 right-3">
          <Badge
            data-testid={`stock-badge-${product.id}`}
            className={`${
              isInStock
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            } px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm`}
          >
            {isInStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Brand */}
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
          {product.brand}
        </p>

        {/* Product Name */}
        <h3 
          className="text-white font-medium text-lg mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors"
          data-testid={`product-name-${product.id}`}
        >
          {product.product_name}
        </h3>

        {/* Color & RAM/ROM */}
        {(product.color || product.ram_rom) && (
          <p className="text-zinc-500 text-xs mb-3">
            {[product.color, product.ram_rom].filter(Boolean).join(" • ")}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span 
            className="text-2xl font-bold text-white font-['Outfit']"
            data-testid={`product-price-${product.id}`}
          >
            {formatPrice(product.price)}
          </span>
          
          <span className="text-zinc-500 text-sm group-hover:text-blue-400 transition-colors">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
