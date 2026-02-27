import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Smartphone, Package, Shield, ChevronRight } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WHATSAPP_NUMBER = "7404693476";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/inventory/${id}`);
      setProduct(response.data);
      
      // Fetch related products (same brand)
      const allProducts = await axios.get(`${API}/inventory`);
      const related = allProducts.data
        .filter((p) => p.brand === response.data.brand && p.id !== id)
        .slice(0, 3);
      setRelatedProducts(related);
    } catch (error) {
      console.error("Error fetching product:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const generateWhatsAppLink = () => {
    const message = encodeURIComponent(
      `Hi, I'm interested in the ${product.product_name} (${product.condition}) listed at ${formatPrice(product.price)}. Is it still available?`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const specsList = product.specifications.split("\n").filter((s) => s.trim());

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white font-['Outfit']">Evol India Shop</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-zinc-400">
          <Link to="/" className="hover:text-white transition-colors" data-testid="breadcrumb-home">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-zinc-500">{product.brand}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{product.product_name}</span>
        </nav>
      </div>

      {/* Product Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <div className="animate-fade-in">
            <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-900/50 border border-white/5 relative group">
              <img
                data-testid="product-image"
                src={product.main_image}
                alt={product.product_name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Condition Badge */}
              <div className="absolute top-4 left-4">
                <Badge
                  data-testid="condition-badge"
                  className={`${
                    product.condition === "New"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  } px-4 py-1.5 text-sm font-medium rounded-full border backdrop-blur-sm`}
                >
                  {product.condition}
                </Badge>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Fast Delivery</p>
                  <p className="text-zinc-500 text-xs">2-3 business days</p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Warranty</p>
                  <p className="text-zinc-500 text-xs">
                    {product.condition === "New" ? "1 year" : "3 months"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="animate-slide-up">
            {/* Brand */}
            <p className="text-zinc-500 text-sm uppercase tracking-wider mb-2" data-testid="product-brand">
              {product.brand}
            </p>

            {/* Product Name */}
            <h1 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 font-['Outfit'] tracking-tight"
              data-testid="product-name"
            >
              {product.product_name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span 
                className="text-4xl sm:text-5xl font-bold text-white font-['Outfit']"
                data-testid="product-price"
              >
                {formatPrice(product.price)}
              </span>
              {product.condition === "Pre-owned" && (
                <span className="text-zinc-500 text-sm">Pre-owned</span>
              )}
            </div>

            {/* WhatsApp CTA */}
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-enquiry-btn"
              className="whatsapp-btn inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-[#25D366] text-white hover:bg-[#128C7E] rounded-full px-8 py-4 font-bold text-lg shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-all animate-pulse-glow mb-10"
            >
              <FaWhatsapp className="w-6 h-6" />
              Enquire on WhatsApp
            </a>

            {/* Specifications */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 font-['Outfit']">Specifications</h2>
              <ul className="space-y-3 specs-list" data-testid="product-specs">
                {specsList.map((spec, index) => (
                  <li key={index} className="flex items-start gap-3 text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <span>{spec.replace(/^[•\-]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Back Button */}
            <Link to="/" className="inline-block mt-8">
              <Button 
                variant="ghost" 
                className="text-zinc-400 hover:text-white hover:bg-white/5"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to catalog
              </Button>
            </Link>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-semibold text-white mb-6 font-['Outfit']">
              More from {product.brand}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="related-products">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to={`/product/${relatedProduct.id}`}
                  className="product-card glass-card rounded-2xl overflow-hidden hover:border-white/20"
                  data-testid={`related-product-${relatedProduct.id}`}
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={relatedProduct.main_image}
                      alt={relatedProduct.product_name}
                      className="product-image w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                      {relatedProduct.brand}
                    </p>
                    <h3 className="text-white font-medium mb-2">{relatedProduct.product_name}</h3>
                    <p className="text-white font-bold font-['Outfit']">
                      {formatPrice(relatedProduct.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
