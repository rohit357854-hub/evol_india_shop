import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Smartphone, Plus, Pencil, Trash2, X, Save, ArrowLeft, 
  Package, IndianRupee, Image as ImageIcon
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Label } from "../components/ui/label";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRANDS = ["Apple", "Samsung", "OnePlus", "Xiaomi", "Google", "Oppo", "Vivo", "Anker"];
const CONDITIONS = ["New", "Pre-owned"];
const CATEGORIES = ["Mobile", "Accessories"];

const emptyProduct = {
  product_name: "",
  brand: "Apple",
  price: "",
  condition: "New",
  category: "Mobile",
  main_image: "",
  specifications: "",
};

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [productToDelete, setProductToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      setProducts(response.data);
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name,
      brand: product.brand,
      price: product.price.toString(),
      condition: product.condition,
      category: product.category || "Mobile",
      main_image: product.main_image,
      specifications: product.specifications,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }
    if (!formData.main_image.trim()) {
      toast.error("Image URL is required");
      return;
    }
    if (!formData.specifications.trim()) {
      toast.error("Specifications are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
      };

      if (editingProduct) {
        await axios.put(`${API}/inventory/${editingProduct.id}`, payload);
        toast.success("Product updated successfully");
      } else {
        await axios.post(`${API}/inventory`, payload);
        toast.success("Product added successfully");
      }
      
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error(editingProduct ? "Failed to update product" : "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await axios.delete(`${API}/inventory/${productToDelete.id}`);
      toast.success("Product deleted successfully");
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

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
            
            <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
              Admin Panel
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link to="/" className="inline-flex items-center text-zinc-400 hover:text-white text-sm mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Store
            </Link>
            <h1 className="text-3xl font-bold text-white font-['Outfit']">Inventory Management</h1>
            <p className="text-zinc-400 mt-1">Manage your mobile device inventory</p>
          </div>
          
          <Button
            data-testid="add-product-btn"
            onClick={openAddDialog}
            className="bg-white text-black hover:bg-zinc-200 rounded-full px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Total Products</p>
              <p className="text-white text-xl font-bold font-['Outfit']" data-testid="total-products">
                {products.length}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">New</Badge>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">New Devices</p>
              <p className="text-white text-xl font-bold font-['Outfit']" data-testid="new-products">
                {products.filter((p) => p.condition === "New").length}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs">Pre</Badge>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Pre-owned Devices</p>
              <p className="text-white text-xl font-bold font-['Outfit']" data-testid="preowned-products">
                {products.filter((p) => p.condition === "Pre-owned").length}
              </p>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-zinc-400">Product</TableHead>
                <TableHead className="text-zinc-400">Brand</TableHead>
                <TableHead className="text-zinc-400">Category</TableHead>
                <TableHead className="text-zinc-400">Price</TableHead>
                <TableHead className="text-zinc-400">Condition</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell colSpan={6}>
                      <div className="skeleton h-12 rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow className="border-white/5">
                  <TableCell colSpan={6} className="text-center py-12">
                    <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No products yet</p>
                    <Button
                      variant="link"
                      onClick={openAddDialog}
                      className="text-blue-400 mt-2"
                    >
                      Add your first product
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow 
                    key={product.id} 
                    className="admin-row border-white/5"
                    data-testid={`product-row-${product.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          <img
                            src={product.main_image}
                            alt={product.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&q=80";
                            }}
                          />
                        </div>
                        <span className="text-white font-medium">{product.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300">{product.brand}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          (product.category || "Mobile") === "Mobile"
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                        } border`}
                      >
                        {product.category || "Mobile"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium font-['Outfit']">
                      {formatPrice(product.price)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          product.condition === "New"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        } border`}
                      >
                        {product.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                          className="text-zinc-400 hover:text-white hover:bg-white/5"
                          data-testid={`edit-btn-${product.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(product)}
                          className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          data-testid={`delete-btn-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg" data-testid="product-form-dialog">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Product Name</Label>
              <Input
                data-testid="input-product-name"
                placeholder="e.g., iPhone 15 Pro Max"
                value={formData.product_name}
                onChange={(e) => handleInputChange("product_name", e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Brand</Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value) => handleInputChange("brand", value)}
                >
                  <SelectTrigger 
                    className="bg-zinc-800/50 border-white/10 text-white"
                    data-testid="select-brand"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {BRANDS.map((brand) => (
                      <SelectItem key={brand} value={brand} className="text-white hover:bg-white/5">
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange("category", value)}
                >
                  <SelectTrigger 
                    className="bg-zinc-800/50 border-white/10 text-white"
                    data-testid="select-category"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white hover:bg-white/5">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => handleInputChange("condition", value)}
                >
                  <SelectTrigger 
                    className="bg-zinc-800/50 border-white/10 text-white"
                    data-testid="select-condition"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition} className="text-white hover:bg-white/5">
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Price (INR)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="input-price"
                    type="number"
                    placeholder="e.g., 159900"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Image URL</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  data-testid="input-image"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.main_image}
                  onChange={(e) => handleInputChange("main_image", e.target.value)}
                  className="bg-zinc-800/50 border-white/10 text-white pl-9"
                />
              </div>
              {formData.main_image && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 mt-2">
                  <img
                    src={formData.main_image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Specifications</Label>
              <Textarea
                data-testid="input-specifications"
                placeholder="• Processor: A17 Pro&#10;• Display: 6.7-inch&#10;• Camera: 48MP"
                value={formData.specifications}
                onChange={(e) => handleInputChange("specifications", e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white min-h-[120px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-product-btn"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingProduct ? "Update" : "Add"} Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md" data-testid="delete-confirm-dialog">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 py-4">
            Are you sure you want to delete <span className="text-white font-medium">{productToDelete?.product_name}</span>? 
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              data-testid="confirm-delete-btn"
              onClick={handleDelete}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
