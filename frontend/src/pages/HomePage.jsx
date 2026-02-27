import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Search, SlidersHorizontal, Smartphone, X, Settings } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import ProductCard from "../components/ProductCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRANDS = ["Apple", "Samsung", "OnePlus", "Xiaomi", "Google", "Oppo", "Vivo"];
const CONDITIONS = ["New", "Pre-owned"];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [maxPrice, setMaxPrice] = useState(200000);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedBrands, selectedConditions, priceRange]);

  const fetchProducts = async () => {
    try {
      // First, try to seed the database
      await axios.post(`${API}/seed`);
      
      const response = await axios.get(`${API}/inventory`);
      setProducts(response.data);
      
      // Calculate max price from products
      if (response.data.length > 0) {
        const max = Math.max(...response.data.map(p => p.price));
        setMaxPrice(max);
        setPriceRange([0, max]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter - case-insensitive across all fields
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

    // Brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) => selectedBrands.includes(p.brand));
    }

    // Condition filter
    if (selectedConditions.length > 0) {
      filtered = filtered.filter((p) => selectedConditions.includes(p.condition));
    }

    // Price filter
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

  const toggleCondition = (condition) => {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedBrands([]);
    setSelectedConditions([]);
    setPriceRange([0, maxPrice]);
  };

  const hasActiveFilters = searchQuery || selectedBrands.length > 0 || selectedConditions.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

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
            
            <Link to="/admin" data-testid="admin-link">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/5">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 font-['Outfit'] tracking-tight">
              Premium Mobile Devices
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Discover the latest smartphones from world-leading brands. New & certified pre-owned.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8 animate-slide-up">
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
            <div className="max-w-4xl mx-auto mb-8 p-6 glass-card rounded-2xl animate-fade-in" data-testid="filters-panel">
              {/* Brands */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Brands</h3>
                <div className="flex flex-wrap gap-2">
                  {BRANDS.map((brand) => (
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

              {/* Conditions */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Condition</h3>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((condition) => (
                    <button
                      key={condition}
                      data-testid={`condition-filter-${condition.toLowerCase().replace('-', '')}`}
                      onClick={() => toggleCondition(condition)}
                      className={`filter-chip px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedConditions.includes(condition)
                          ? condition === "New"
                            ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                            : "bg-orange-500/20 border-orange-500/30 text-orange-400"
                          : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
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

              {/* Clear Filters */}
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

          {/* Quick Filter Chips (always visible) */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {CONDITIONS.map((condition) => (
              <button
                key={condition}
                data-testid={`quick-filter-${condition.toLowerCase().replace('-', '')}`}
                onClick={() => toggleCondition(condition)}
                className={`filter-chip px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  selectedConditions.includes(condition)
                    ? condition === "New"
                      ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                      : "bg-orange-500/20 border-orange-500/30 text-orange-400"
                    : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {condition}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-zinc-400 text-sm">
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Showing <span className="text-white font-medium">{filteredProducts.length}</span> of{" "}
                  <span className="text-white font-medium">{products.length}</span> products
                </>
              )}
            </p>
            {hasActiveFilters && (
              <Badge variant="outline" className="bg-white/5 border-white/10 text-zinc-400">
                Filters active
              </Badge>
            )}
          </div>

          {/* Products */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl h-[400px]" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              data-testid="products-grid"
            >
              {filteredProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
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
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-500 text-sm">
            © 2024 Evol India Shop. Premium mobile devices marketplace.
          </p>
        </div>
      </footer>
    </div>
  );
}
