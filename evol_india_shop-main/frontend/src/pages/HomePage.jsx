import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Search, SlidersHorizontal, Smartphone, X, Settings, Headphones, RefreshCcw, Home, MapPin, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import ProductCard from "../components/ProductCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRANDS = ["Apple", "Samsung", "OnePlus", "Xiaomi", "Google", "Oppo", "Vivo", "Anker"];

export default function HomePage() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [maxPrice, setMaxPrice] = useState(200000);
  const [showFilters, setShowFilters] = useState(false);
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [settings, setSettings] = useState(null);

  // Determine current page category from URL
  const getCurrentCategory = () => {
    const path = location.pathname;
    if (path === "/mobiles") return "mobiles";
    if (path === "/used") return "used";
    if (path === "/accessories") return "accessories";
    return "home";
  };

  const currentCategory = getCurrentCategory();

  const getPageTitle = () => {
    switch (currentCategory) {
      case "mobiles": return "Mobile Phones";
      case "used": return "Pre-owned Phones";
      case "accessories": return "Accessories";
      default: return "All Products";
    }
  };

  const getPageSubtitle = () => {
    switch (currentCategory) {
      case "mobiles": return "Brand new smartphones from top manufacturers";
      case "used": return "Certified pre-owned devices with warranty";
      case "accessories": return "Chargers, earbuds, and more";
      default: return "Discover the latest smartphones and accessories";
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedBrands, priceRange, currentCategory]);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const fetchData = async () => {
    try {
      await axios.post(`${API}/seed`);
      
      const [productsRes, bannersRes, settingsRes] = await Promise.all([
        axios.get(`${API}/inventory`),
        axios.get(`${API}/banners`),
        axios.get(`${API}/settings`)
      ]);
      
      setProducts(productsRes.data);
      setBanners(bannersRes.data);
      setSettings(settingsRes.data);
      
      if (productsRes.data.length > 0) {
        const max = Math.max(...productsRes.data.map(p => p.price));
        setMaxPrice(max);
        setPriceRange([0, max]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (currentCategory === "mobiles") {
      filtered = filtered.filter((p) => (p.category || "Mobile") === "Mobile" && p.condition === "New");
    } else if (currentCategory === "used") {
      filtered = filtered.filter((p) => p.condition === "Pre-owned");
    } else if (currentCategory === "accessories") {
      filtered = filtered.filter((p) => (p.category || "Mobile") === "Accessories");
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const name = (p.product_name || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const specs = (p.specifications || "").toLowerCase();
        const condition = (p.condition || "").toLowerCase();
        const category = (p.category || "").toLowerCase();
        return (
          name.includes(query) ||
          brand.includes(query) ||
          specs.includes(query) ||
          condition.includes(query) ||
          category.includes(query)
        );
      });
    }

    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) => selectedBrands.includes(p.brand));
    }

    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    setFilteredProducts(filtered);
  };

  const toggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedBrands([]);
    setPriceRange([0, maxPrice]);
  };

  const hasActiveFilters = searchQuery || selectedBrands.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getRelevantBrands = () => {
    const relevantProducts = products.filter((p) => {
      if (currentCategory === "mobiles") return (p.category || "Mobile") === "Mobile" && p.condition === "New";
      if (currentCategory === "used") return p.condition === "Pre-owned";
      if (currentCategory === "accessories") return (p.category || "Mobile") === "Accessories";
      return true;
    });
    return [...new Set(relevantProducts.map((p) => p.brand))];
  };

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/mobiles", label: "Mobiles", icon: Smartphone },
    { path: "/used", label: "Used Phones", icon: RefreshCcw },
    { path: "/accessories", label: "Accessories", icon: Headphones },
  ];

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);

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

            <nav className="hidden md:flex items-center gap-1" data-testid="nav-menu">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            
            <Link to="/admin/login" data-testid="admin-link">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/5">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>

          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto" data-testid="mobile-nav-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Hero Slider - Only on Home */}
      {currentCategory === "home" && banners.length > 0 && (
        <section className="relative overflow-hidden" data-testid="hero-slider">
          <div className="relative h-[300px] sm:h-[400px] lg:h-[500px]">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentBanner ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12">
                  <div className="max-w-7xl mx-auto">
                    {banner.title && (
                      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 font-['Outfit']">
                        {banner.title}
                      </h2>
                    )}
                    {banner.subtitle && (
                      <p className="text-base sm:text-lg text-zinc-300 mb-4">{banner.subtitle}</p>
                    )}
                    {banner.link && (
                      <Link to={banner.link}>
                        <Button className="bg-white text-black hover:bg-zinc-200 rounded-full">
                          Shop Now
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={prevBanner}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  data-testid="slider-prev"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextBanner}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  data-testid="slider-next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBanner(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentBanner ? "bg-white w-6" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Page Title Section */}
      <section className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {currentCategory !== "home" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
          </>
        )}
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 font-['Outfit'] tracking-tight">
              {getPageTitle()}
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
              {getPageSubtitle()}
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6 animate-slide-up">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                data-testid="search-input"
                type="text"
                placeholder="Search phones, brands, features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 bg-zinc-900/50 border-white/10 rounded-2xl text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 search-input"
              />
              <Button
                data-testid="filter-toggle-btn"
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white hover:bg-white/5 ${showFilters ? 'bg-white/10 text-white' : ''}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="max-w-4xl mx-auto mb-6 p-6 glass-card rounded-2xl animate-fade-in" data-testid="filters-panel">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Brands</h3>
                <div className="flex flex-wrap gap-2">
                  {getRelevantBrands().map((brand) => (
                    <button
                      key={brand}
                      data-testid={`brand-filter-${brand.toLowerCase()}`}
                      onClick={() => toggleBrand(brand)}
                      className={`filter-chip px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedBrands.includes(brand)
                          ? "bg-white/15 border-white/30 text-white"
                          : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Price Range</h3>
                  <span className="text-sm text-white font-medium">
                    {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  </span>
                </div>
                <Slider
                  data-testid="price-range-slider"
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={maxPrice}
                  step={1000}
                  className="w-full"
                />
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    data-testid="clear-filters-btn"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <p className="text-zinc-400 text-sm">
              {loading ? "Loading..." : (
                <>Showing <span className="text-white font-medium">{filteredProducts.length}</span> products</>
              )}
            </p>
            {hasActiveFilters && (
              <Badge variant="outline" className="bg-white/5 border-white/10 text-zinc-400">
                Filters active
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl h-[400px]" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="products-grid">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20" data-testid="no-results">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-900/50 flex items-center justify-center">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-['Outfit']">No products found</h3>
              <p className="text-zinc-400 mb-6">Try adjusting your search or filter criteria</p>
              <Button
                data-testid="reset-filters-btn"
                variant="outline"
                onClick={clearFilters}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white font-['Outfit']">Evol India Shop</span>
              </div>
              <p className="text-zinc-400 text-sm">
                Premium mobile phones and accessories at best prices. New & certified pre-owned devices with warranty.
              </p>
            </div>

            {/* Store Details */}
            <div>
              <h3 className="text-white font-semibold mb-4 font-['Outfit']">Visit Our Store</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-zinc-400 text-sm">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-blue-400" />
                  <span>{settings?.address || "Delhi Rohtak Road, Metro Pillar No. 844, Near Standard Sweet, Bahadurgarh"}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400 text-sm">
                  <Phone className="w-4 h-4 flex-shrink-0 text-blue-400" />
                  <span>{settings?.phone || "7404693476"}</span>
                </div>
                <a
                  href={settings?.google_maps_url || "https://www.google.com/maps/search/?api=1&query=Bahadurgarh+Metro+Pillar+844"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
                  data-testid="google-maps-btn"
                >
                  <MapPin className="w-4 h-4" />
                  View on Google Maps
                </a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-4 font-['Outfit']">Get in Touch</h3>
              <a
                href={`https://wa.me/${settings?.whatsapp || "7404693476"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-full font-medium hover:bg-[#128C7E] transition-colors shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                data-testid="whatsapp-footer-btn"
              >
                <FaWhatsapp className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-white/5 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-zinc-500 text-sm">
              © 2024 {settings?.shop_name || "Evol India Shop"}. All rights reserved.
            </p>
            <p className="text-zinc-500 text-sm">
              Developed with ❤️ by <span className="text-zinc-400">{settings?.developer_name || "Developer"}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
