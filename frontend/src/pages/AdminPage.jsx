import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Smartphone, Plus, Pencil, Trash2, Save, ArrowLeft, 
  Package, IndianRupee, Image as ImageIcon, Upload, Settings, 
  LogOut, ImagePlus, X, FileSpreadsheet, Palette
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";

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
  images: [],
  color: "",
  ram_rom: "",
  stock_count: "10",
  specifications: "",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [bannerFormData, setBannerFormData] = useState({ image_url: "", title: "", subtitle: "", link: "", is_active: true, order: 0 });
  const [productToDelete, setProductToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
  });

  useEffect(() => {
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login");
      return;
    }

    try {
      await axios.get(`${API}/admin/verify`, getAuthHeaders());
      setIsAuthenticated(true);
      fetchData();
    } catch (error) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUsername");
      navigate("/admin/login");
    }
  };

  const fetchData = async () => {
    try {
      const [productsRes, bannersRes, settingsRes] = await Promise.all([
        axios.get(`${API}/inventory`),
        axios.get(`${API}/banners/all`, getAuthHeaders()),
        axios.get(`${API}/settings`)
      ]);
      setProducts(productsRes.data);
      setBanners(bannersRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/admin/login");
      } else {
        toast.error("Failed to fetch data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    navigate("/admin/login");
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
      images: product.images || [],
      color: product.color || "",
      ram_rom: product.ram_rom || "",
      stock_count: (product.stock_count || 10).toString(),
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
    if (!formData.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock_count: parseInt(formData.stock_count) || 10,
      };

      if (editingProduct) {
        await axios.put(`${API}/inventory/${editingProduct.id}`, payload, getAuthHeaders());
        toast.success("Product updated successfully");
      } else {
        await axios.post(`${API}/inventory`, payload, getAuthHeaders());
        toast.success("Product added successfully");
      }
      
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(editingProduct ? "Failed to update product" : "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await axios.delete(`${API}/inventory/${productToDelete.id}`, getAuthHeaders());
      toast.success("Product deleted successfully");
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/inventory/bulk-upload`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(response.data.message);
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} rows had errors`);
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      await axios.put(`${API}/settings`, settings, getAuthHeaders());
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  // Password change function
  const handleChangePassword = async () => {
    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error("Please fill all password fields");
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    
    setChangingPassword(true);
    try {
      await axios.post(`${API}/admin/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      }, getAuthHeaders());
      
      toast.success("Password changed successfully!");
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  // Banner functions
  const openBannerDialog = (banner = null) => {
    setEditingBanner(banner);
    setBannerFormData(banner || { image_url: "", title: "", subtitle: "", link: "", is_active: true, order: 0 });
    setIsBannerDialogOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!bannerFormData.image_url.trim()) {
      toast.error("Image URL is required");
      return;
    }

    try {
      if (editingBanner) {
        await axios.put(`${API}/banners/${editingBanner.id}`, bannerFormData, getAuthHeaders());
        toast.success("Banner updated");
      } else {
        await axios.post(`${API}/banners`, bannerFormData, getAuthHeaders());
        toast.success("Banner added");
      }
      setIsBannerDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save banner");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    try {
      await axios.delete(`${API}/banners/${bannerId}`, getAuthHeaders());
      toast.success("Banner deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete banner");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 animate-pulse" />
      </div>
    );
  }

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
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
                Admin Panel
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
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
            <h1 className="text-3xl font-bold text-white font-['Outfit']">Dashboard</h1>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="bg-zinc-900/50 border border-white/10">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-white/10">
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="banners" className="data-[state=active]:bg-white/10">
              <ImagePlus className="w-4 h-4 mr-2" />
              Banners
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/10">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Total</p>
                  <p className="text-white text-xl font-bold font-['Outfit']">{products.length}</p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">New</Badge>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">New</p>
                  <p className="text-white text-xl font-bold font-['Outfit']">
                    {products.filter((p) => p.condition === "New").length}
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs">Pre</Badge>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Pre-owned</p>
                  <p className="text-white text-xl font-bold font-['Outfit']">
                    {products.filter((p) => p.condition === "Pre-owned").length}
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Out of Stock</p>
                  <p className="text-white text-xl font-bold font-['Outfit']">
                    {products.filter((p) => (p.stock_count || 0) === 0).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                data-testid="add-product-btn"
                onClick={openAddDialog}
                className="bg-white text-black hover:bg-zinc-200 rounded-full px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="hidden"
                data-testid="csv-upload-input"
              />
              <Button
                data-testid="bulk-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5 rounded-full px-6"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Bulk Upload CSV"}
              </Button>
            </div>

            {/* CSV Format Help */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">CSV Format</p>
                  <p className="text-zinc-400 text-sm">
                    Headers: product_name, brand, price, condition, category, main_image, images (pipe-separated), color, ram_rom, stock_count, specifications
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
                    <TableHead className="text-zinc-400">Stock</TableHead>
                    <TableHead className="text-zinc-400">Condition</TableHead>
                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={7} className="text-center py-12">
                        <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400">No products yet</p>
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
                            <div>
                              <span className="text-white font-medium block">{product.product_name}</span>
                              {product.color && <span className="text-zinc-500 text-xs">{product.color}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-300">{product.brand}</TableCell>
                        <TableCell>
                          <Badge className={`${(product.category || "Mobile") === "Mobile" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"} border`}>
                            {product.category || "Mobile"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-medium font-['Outfit']">
                          {formatPrice(product.price)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${(product.stock_count || 0) > 0 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"} border`}>
                            {(product.stock_count || 0) > 0 ? product.stock_count : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${product.condition === "New" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-orange-500/20 text-orange-400 border-orange-500/30"} border`}>
                            {product.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)} className="text-zinc-400 hover:text-white hover:bg-white/5">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(product)} className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10">
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
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white font-['Outfit']">Hero Slider Banners</h2>
              <Button onClick={() => openBannerDialog()} className="bg-white text-black hover:bg-zinc-200 rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="glass-card rounded-xl overflow-hidden">
                  <div className="aspect-video relative">
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                    {!banner.is_active && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-red-500/20 text-red-400">Inactive</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-medium">{banner.title || "Untitled"}</h3>
                    <p className="text-zinc-400 text-sm">{banner.subtitle}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge className="bg-zinc-800 text-zinc-400">Order: {banner.order}</Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openBannerDialog(banner)} className="text-zinc-400 hover:text-white">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBanner(banner.id)} className="text-zinc-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Palette className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No banners yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {settings && (
              <div className="glass-card rounded-2xl p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white font-['Outfit']">Shop Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Shop Name</Label>
                    <Input
                      value={settings.shop_name}
                      onChange={(e) => setSettings({...settings, shop_name: e.target.value})}
                      className="bg-zinc-900/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Phone Number</Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings({...settings, phone: e.target.value})}
                      className="bg-zinc-900/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">WhatsApp Number</Label>
                    <Input
                      value={settings.whatsapp}
                      onChange={(e) => setSettings({...settings, whatsapp: e.target.value})}
                      className="bg-zinc-900/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Developer Name</Label>
                    <Input
                      value={settings.developer_name}
                      onChange={(e) => setSettings({...settings, developer_name: e.target.value})}
                      className="bg-zinc-900/50 border-white/10 text-white"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Shop Address</Label>
                  <Textarea
                    value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    className="bg-zinc-900/50 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Google Maps URL</Label>
                  <Input
                    value={settings.google_maps_url}
                    onChange={(e) => setSettings({...settings, google_maps_url: e.target.value})}
                    className="bg-zinc-900/50 border-white/10 text-white"
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">SEO Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Meta Title</Label>
                      <Input
                        value={settings.meta_title}
                        onChange={(e) => setSettings({...settings, meta_title: e.target.value})}
                        className="bg-zinc-900/50 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Meta Description</Label>
                      <Textarea
                        value={settings.meta_description}
                        onChange={(e) => setSettings({...settings, meta_description: e.target.value})}
                        className="bg-zinc-900/50 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} className="bg-white text-black hover:bg-zinc-200 rounded-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            )}

            {/* Password Change Section */}
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-semibold text-white font-['Outfit']">Change Password</h2>
              <p className="text-zinc-400 text-sm">Update your admin login password</p>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Current Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({...passwordData, old_password: e.target.value})}
                    className="bg-zinc-900/50 border-white/10 text-white"
                    data-testid="current-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">New Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    className="bg-zinc-900/50 border-white/10 text-white"
                    data-testid="new-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    className="bg-zinc-900/50 border-white/10 text-white"
                    data-testid="confirm-password-input"
                  />
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword}
                  className="bg-white text-black hover:bg-zinc-200 rounded-full"
                  data-testid="change-password-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {changingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Product Name</Label>
              <Input
                placeholder="e.g., iPhone 15 Pro Max"
                value={formData.product_name}
                onChange={(e) => handleInputChange("product_name", e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Brand</Label>
                <Select value={formData.brand} onValueChange={(value) => handleInputChange("brand", value)}>
                  <SelectTrigger className="bg-zinc-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {BRANDS.map((brand) => (
                      <SelectItem key={brand} value={brand} className="text-white hover:bg-white/5">{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger className="bg-zinc-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white hover:bg-white/5">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Condition</Label>
                <Select value={formData.condition} onValueChange={(value) => handleInputChange("condition", value)}>
                  <SelectTrigger className="bg-zinc-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition} className="text-white hover:bg-white/5">{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Price (INR)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="number"
                    placeholder="159900"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Color</Label>
                <Input
                  placeholder="e.g., Titanium Black"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">RAM/ROM</Label>
                <Input
                  placeholder="e.g., 8GB/256GB"
                  value={formData.ram_rom}
                  onChange={(e) => handleInputChange("ram_rom", e.target.value)}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Stock Count</Label>
              <Input
                type="number"
                placeholder="10"
                value={formData.stock_count}
                onChange={(e) => handleInputChange("stock_count", e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Main Image URL</Label>
              <Input
                placeholder="https://..."
                value={formData.main_image}
                onChange={(e) => handleInputChange("main_image", e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Specifications</Label>
              <Textarea
                placeholder="• Processor: A17 Pro&#10;• Display: 6.7-inch"
                value={formData.specifications}
                onChange={(e) => handleInputChange("specifications", e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-white text-black hover:bg-zinc-200">
              {saving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />{editingProduct ? "Update" : "Add"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 py-4">
            Are you sure you want to delete <span className="text-white font-medium">{productToDelete?.product_name}</span>?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Dialog */}
      <Dialog open={isBannerDialogOpen} onOpenChange={setIsBannerDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">{editingBanner ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Image URL (1920x800 recommended)</Label>
              <Input
                placeholder="https://..."
                value={bannerFormData.image_url}
                onChange={(e) => setBannerFormData({...bannerFormData, image_url: e.target.value})}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Title</Label>
                <Input
                  placeholder="Banner title"
                  value={bannerFormData.title}
                  onChange={(e) => setBannerFormData({...bannerFormData, title: e.target.value})}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Order</Label>
                <Input
                  type="number"
                  value={bannerFormData.order}
                  onChange={(e) => setBannerFormData({...bannerFormData, order: parseInt(e.target.value) || 0})}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Subtitle</Label>
              <Input
                placeholder="Banner subtitle"
                value={bannerFormData.subtitle}
                onChange={(e) => setBannerFormData({...bannerFormData, subtitle: e.target.value})}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Link (optional)</Label>
              <Input
                placeholder="/mobiles"
                value={bannerFormData.link}
                onChange={(e) => setBannerFormData({...bannerFormData, link: e.target.value})}
                className="bg-zinc-800/50 border-white/10 text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={bannerFormData.is_active}
                onCheckedChange={(checked) => setBannerFormData({...bannerFormData, is_active: checked})}
              />
              <Label className="text-zinc-400">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBannerDialogOpen(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
            <Button onClick={handleSaveBanner} className="bg-white text-black hover:bg-zinc-200">
              <Save className="w-4 h-4 mr-2" />{editingBanner ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
