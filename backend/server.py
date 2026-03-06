from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'evol-india-shop-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_name: str
    brand: str
    price: float
    condition: str  # "New" or "Pre-owned"
    category: str = "Mobile"  # "Mobile" or "Accessories"
    main_image: str
    images: List[str] = []  # Multiple image URLs
    color: str = ""
    ram_rom: str = ""  # e.g., "8GB/128GB"
    stock_count: int = 10
    specifications: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryItemCreate(BaseModel):
    product_name: str
    brand: str
    price: float
    condition: str
    category: str = "Mobile"
    main_image: str
    images: List[str] = []
    color: str = ""
    ram_rom: str = ""
    stock_count: int = 10
    specifications: str

class InventoryItemUpdate(BaseModel):
    product_name: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None
    category: Optional[str] = None
    main_image: Optional[str] = None
    images: Optional[List[str]] = None
    color: Optional[str] = None
    ram_rom: Optional[str] = None
    stock_count: Optional[int] = None
    specifications: Optional[str] = None

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class ShopSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "shop_settings"
    shop_name: str = "Evol India Shop"
    address: str = "Delhi Rohtak Road, Metro Pillar No. 844, Near Standard Sweet, Bahadurgarh"
    phone: str = "7404693476"
    whatsapp: str = "7404693476"
    google_maps_url: str = "https://www.google.com/maps/search/?api=1&query=Bahadurgarh+Metro+Pillar+844"
    developer_name: str = "Developer"
    meta_title: str = "Evol India Shop - Best Mobiles & Accessories in Bahadurgarh"
    meta_description: str = "Premium mobile phones, pre-owned devices, and accessories at best prices in Bahadurgarh. Visit us near Metro Pillar 844."
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Banner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: str
    title: str = ""
    subtitle: str = ""
    link: str = ""
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerCreate(BaseModel):
    image_url: str
    title: str = ""
    subtitle: str = ""
    link: str = ""
    is_active: bool = True
    order: int = 0

class StockUpdate(BaseModel):
    quantity: int = 1

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(username: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": username, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ENDPOINTS ==============

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login endpoint"""
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    
    # Create default admin if none exists
    if not admin:
        admin_count = await db.admins.count_documents({})
        if admin_count == 0 and credentials.username == "admin" and credentials.password == "admin123":
            # Create default admin
            new_admin = {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": hash_password("admin123"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(new_admin)
            token = create_token("admin")
            return {"token": token, "username": "admin", "message": "Default admin created"}
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin["username"])
    return {"token": token, "username": admin["username"]}

@api_router.get("/admin/verify")
async def verify_admin(username: str = Depends(verify_token)):
    """Verify admin token"""
    return {"valid": True, "username": username}

@api_router.post("/admin/change-password")
async def change_admin_password(
    data: dict,
    username: str = Depends(verify_token)
):
    """Change admin password"""
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Both old and new passwords are required")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    admin = await db.admins.find_one({"username": username}, {"_id": 0})
    if not admin or not verify_password(old_password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid current password")
    
    new_hash = hash_password(new_password)
    await db.admins.update_one({"username": username}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}

# ============== INVENTORY ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "Evol India Shop API"}

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_all_inventory():
    """Get all inventory items"""
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
        # Ensure new fields have defaults
        item.setdefault('images', [])
        item.setdefault('color', '')
        item.setdefault('ram_rom', '')
        item.setdefault('stock_count', 10)
    return items

@api_router.get("/inventory/{item_id}", response_model=InventoryItem)
async def get_inventory_item(item_id: str):
    """Get a single inventory item by ID"""
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    item.setdefault('images', [])
    item.setdefault('color', '')
    item.setdefault('ram_rom', '')
    item.setdefault('stock_count', 10)
    return item

@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item: InventoryItemCreate, _: str = Depends(verify_token)):
    """Create a new inventory item (requires auth)"""
    item_obj = InventoryItem(**item.model_dump())
    doc = item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.inventory.insert_one(doc)
    return item_obj

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: str, item_update: InventoryItemUpdate, _: str = Depends(verify_token)):
    """Update an existing inventory item (requires auth)"""
    existing = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.inventory.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    updated.setdefault('images', [])
    updated.setdefault('color', '')
    updated.setdefault('ram_rom', '')
    updated.setdefault('stock_count', 10)
    return updated

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, _: str = Depends(verify_token)):
    """Delete an inventory item (requires auth)"""
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@api_router.post("/inventory/{item_id}/decrement-stock")
async def decrement_stock(item_id: str, stock_update: StockUpdate, _: str = Depends(verify_token)):
    """Decrement stock when sale is made (requires auth)"""
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    current_stock = item.get('stock_count', 10)
    new_stock = max(0, current_stock - stock_update.quantity)
    
    await db.inventory.update_one(
        {"id": item_id}, 
        {"$set": {"stock_count": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Stock updated", "new_stock": new_stock}

@api_router.post("/inventory/bulk-upload")
async def bulk_upload_inventory(file: UploadFile = File(...), _: str = Depends(verify_token)):
    """Bulk upload products from CSV file (requires auth)"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    products = []
    errors = []
    row_num = 1
    
    for row in reader:
        row_num += 1
        try:
            product = {
                "id": str(uuid.uuid4()),
                "product_name": row.get('product_name', '').strip(),
                "brand": row.get('brand', '').strip(),
                "price": float(row.get('price', 0)),
                "condition": row.get('condition', 'New').strip(),
                "category": row.get('category', 'Mobile').strip(),
                "main_image": row.get('main_image', '').strip(),
                "images": [img.strip() for img in row.get('images', '').split('|') if img.strip()],
                "color": row.get('color', '').strip(),
                "ram_rom": row.get('ram_rom', '').strip(),
                "stock_count": int(row.get('stock_count', 10)),
                "specifications": row.get('specifications', '').strip(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if not product['product_name']:
                errors.append(f"Row {row_num}: Missing product_name")
                continue
            if not product['brand']:
                errors.append(f"Row {row_num}: Missing brand")
                continue
            if product['price'] <= 0:
                errors.append(f"Row {row_num}: Invalid price")
                continue
                
            products.append(product)
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    if products:
        await db.inventory.insert_many(products)
    
    return {
        "message": f"Uploaded {len(products)} products successfully",
        "uploaded": len(products),
        "errors": errors[:10] if errors else []  # Return first 10 errors
    }

# ============== SETTINGS ENDPOINTS ==============

@api_router.get("/settings")
async def get_settings():
    """Get shop settings"""
    settings = await db.settings.find_one({"id": "shop_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = ShopSettings().model_dump()
        default_settings['updated_at'] = default_settings['updated_at'].isoformat()
        await db.settings.insert_one(default_settings)
        return ShopSettings()
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return settings

@api_router.put("/settings")
async def update_settings(settings: ShopSettings, _: str = Depends(verify_token)):
    """Update shop settings (requires auth)"""
    settings_dict = settings.model_dump()
    settings_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "shop_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    return {"message": "Settings updated successfully"}

# ============== BANNER ENDPOINTS ==============

@api_router.get("/banners", response_model=List[Banner])
async def get_banners():
    """Get all active banners"""
    banners = await db.banners.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(20)
    for banner in banners:
        if isinstance(banner.get('created_at'), str):
            banner['created_at'] = datetime.fromisoformat(banner['created_at'])
    return banners

@api_router.get("/banners/all", response_model=List[Banner])
async def get_all_banners(_: str = Depends(verify_token)):
    """Get all banners including inactive (requires auth)"""
    banners = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    for banner in banners:
        if isinstance(banner.get('created_at'), str):
            banner['created_at'] = datetime.fromisoformat(banner['created_at'])
    return banners

@api_router.post("/banners", response_model=Banner)
async def create_banner(banner: BannerCreate, _: str = Depends(verify_token)):
    """Create a new banner (requires auth)"""
    banner_obj = Banner(**banner.model_dump())
    doc = banner_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.banners.insert_one(doc)
    return banner_obj

@api_router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, banner: BannerCreate, _: str = Depends(verify_token)):
    """Update a banner (requires auth)"""
    result = await db.banners.update_one(
        {"id": banner_id},
        {"$set": banner.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner updated successfully"}

@api_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, _: str = Depends(verify_token)):
    """Delete a banner (requires auth)"""
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted successfully"}

# ============== SEED ENDPOINTS ==============

@api_router.get("/brands", response_model=List[str])
async def get_brands():
    """Get all unique brands"""
    brands = await db.inventory.distinct("brand")
    return brands

@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample products"""
    count = await db.inventory.count_documents({})
    if count > 0:
        return {"message": "Database already seeded", "count": count}
    
    sample_products = [
        # Mobile Phones - New
        {
            "id": str(uuid.uuid4()),
            "product_name": "iPhone 15 Pro Max",
            "brand": "Apple",
            "price": 159900,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1695822877321-15ef5412b82e?w=800&q=80",
            "images": [],
            "color": "Natural Titanium",
            "ram_rom": "8GB/256GB",
            "stock_count": 15,
            "specifications": "• A17 Pro chip\n• 6.7-inch Super Retina XDR display\n• 48MP main camera\n• Titanium design\n• 256GB Storage\n• Action Button\n• USB-C with USB 3 speeds",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Samsung Galaxy S24 Ultra",
            "brand": "Samsung",
            "price": 134999,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
            "images": [],
            "color": "Titanium Black",
            "ram_rom": "12GB/256GB",
            "stock_count": 12,
            "specifications": "• Snapdragon 8 Gen 3\n• 6.8-inch QHD+ Dynamic AMOLED\n• 200MP main camera\n• S Pen included\n• 256GB Storage\n• Galaxy AI features\n• Titanium frame",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Google Pixel 8 Pro",
            "brand": "Google",
            "price": 106999,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
            "images": [],
            "color": "Obsidian",
            "ram_rom": "12GB/128GB",
            "stock_count": 8,
            "specifications": "• Google Tensor G3\n• 6.7-inch LTPO OLED\n• 50MP main + 48MP ultrawide\n• 7 years of updates\n• 128GB Storage\n• Magic Eraser & Best Take\n• Temperature sensor",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "OnePlus 12",
            "brand": "OnePlus",
            "price": 64999,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            "images": [],
            "color": "Silky Black",
            "ram_rom": "12GB/256GB",
            "stock_count": 20,
            "specifications": "• Snapdragon 8 Gen 3\n• 6.82-inch LTPO AMOLED\n• Hasselblad camera system\n• 100W SUPERVOOC charging\n• 256GB Storage\n• OxygenOS 14\n• 5400mAh battery",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Xiaomi 14 Ultra",
            "brand": "Xiaomi",
            "price": 99999,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80",
            "images": [],
            "color": "Black",
            "ram_rom": "16GB/512GB",
            "stock_count": 5,
            "specifications": "• Snapdragon 8 Gen 3\n• 6.73-inch LTPO AMOLED\n• Leica quad camera\n• 90W wired + 80W wireless\n• 512GB Storage\n• HyperOS\n• Variable aperture",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Oppo Find X7 Ultra",
            "brand": "Oppo",
            "price": 84999,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&q=80",
            "images": [],
            "color": "Ocean Blue",
            "ram_rom": "16GB/256GB",
            "stock_count": 7,
            "specifications": "• Snapdragon 8 Gen 3\n• 6.82-inch LTPO AMOLED\n• Hasselblad dual periscope\n• 100W SUPERVOOC\n• 256GB Storage\n• ColorOS 14\n• 5000mAh battery",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Vivo X100 Pro",
            "brand": "Vivo",
            "price": 89999,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&q=80",
            "images": [],
            "color": "Asteroid Black",
            "ram_rom": "16GB/256GB",
            "stock_count": 10,
            "specifications": "• Dimensity 9300\n• 6.78-inch LTPO AMOLED\n• ZEISS camera system\n• 100W FlashCharge\n• 256GB Storage\n• Funtouch OS 14\n• 5400mAh battery",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # Mobile Phones - Pre-owned
        {
            "id": str(uuid.uuid4()),
            "product_name": "iPhone 14 Pro",
            "brand": "Apple",
            "price": 89999,
            "condition": "Pre-owned",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=800&q=80",
            "images": [],
            "color": "Deep Purple",
            "ram_rom": "6GB/128GB",
            "stock_count": 3,
            "specifications": "• A16 Bionic chip\n• 6.1-inch Super Retina XDR\n• 48MP main camera\n• Dynamic Island\n• 128GB Storage\n• Excellent condition\n• 3 months warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Samsung Galaxy S23",
            "brand": "Samsung",
            "price": 54999,
            "condition": "Pre-owned",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&q=80",
            "images": [],
            "color": "Phantom Black",
            "ram_rom": "8GB/128GB",
            "stock_count": 4,
            "specifications": "• Snapdragon 8 Gen 2\n• 6.1-inch Dynamic AMOLED\n• 50MP main camera\n• 128GB Storage\n• Very good condition\n• Original box included\n• 2 months warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "iPhone 13",
            "brand": "Apple",
            "price": 49999,
            "condition": "Pre-owned",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1632633173522-47456de71b76?w=800&q=80",
            "images": [],
            "color": "Midnight",
            "ram_rom": "4GB/128GB",
            "stock_count": 0,
            "specifications": "• A15 Bionic chip\n• 6.1-inch Super Retina XDR\n• Dual camera system\n• 128GB Storage\n• Good condition\n• Battery health 85%\n• 2 months warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "OnePlus 11",
            "brand": "OnePlus",
            "price": 39999,
            "condition": "Pre-owned",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800&q=80",
            "images": [],
            "color": "Titan Black",
            "ram_rom": "8GB/128GB",
            "stock_count": 2,
            "specifications": "• Snapdragon 8 Gen 2\n• 6.7-inch AMOLED\n• Hasselblad camera\n• 128GB Storage\n• Excellent condition\n• All accessories included\n• 3 months warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # Accessories
        {
            "id": str(uuid.uuid4()),
            "product_name": "Apple AirPods Pro 2nd Gen",
            "brand": "Apple",
            "price": 24999,
            "condition": "New",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80",
            "images": [],
            "color": "White",
            "ram_rom": "",
            "stock_count": 25,
            "specifications": "• Active Noise Cancellation\n• Adaptive Transparency\n• Personalized Spatial Audio\n• MagSafe Charging Case\n• Up to 6 hours listening\n• Touch control\n• IPX4 sweat resistant",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Samsung Galaxy Buds2 Pro",
            "brand": "Samsung",
            "price": 17999,
            "condition": "New",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
            "images": [],
            "color": "Graphite",
            "ram_rom": "",
            "stock_count": 18,
            "specifications": "• 24-bit Hi-Fi sound\n• Intelligent ANC\n• 360 Audio\n• IPX7 water resistant\n• 5 hours playback\n• Wireless charging\n• Voice detect",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Apple 20W USB-C Charger",
            "brand": "Apple",
            "price": 1900,
            "condition": "New",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
            "images": [],
            "color": "White",
            "ram_rom": "",
            "stock_count": 50,
            "specifications": "• 20W fast charging\n• USB-C connector\n• Works with iPhone 8+\n• Compact design\n• Original Apple product\n• 1 year warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Samsung 45W Super Fast Charger",
            "brand": "Samsung",
            "price": 2999,
            "condition": "New",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1618478594486-c65b899c4936?w=800&q=80",
            "images": [],
            "color": "Black",
            "ram_rom": "",
            "stock_count": 30,
            "specifications": "• 45W Super Fast Charging\n• USB-C to USB-C\n• PPS technology\n• Compact travel design\n• LED indicator\n• Original Samsung product",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "OnePlus Buds Pro 2",
            "brand": "OnePlus",
            "price": 11999,
            "condition": "New",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80",
            "images": [],
            "color": "Obsidian Black",
            "ram_rom": "",
            "stock_count": 15,
            "specifications": "• Dual drivers\n• Adaptive noise cancellation\n• Spatial Audio\n• 39 hours total battery\n• IP55 rating\n• Google Fast Pair\n• Zen Mode Air",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Anker PowerCore 10000mAh",
            "brand": "Anker",
            "price": 2499,
            "condition": "New",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80",
            "images": [],
            "color": "Black",
            "ram_rom": "",
            "stock_count": 40,
            "specifications": "• 10000mAh capacity\n• 22.5W fast charging\n• USB-C & USB-A ports\n• Ultra compact\n• PowerIQ 3.0\n• Charges iPhone 2.5x",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Apple AirPods 3rd Gen",
            "brand": "Apple",
            "price": 14999,
            "condition": "Pre-owned",
            "category": "Accessories",
            "main_image": "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=800&q=80",
            "images": [],
            "color": "White",
            "ram_rom": "",
            "stock_count": 6,
            "specifications": "• Spatial Audio\n• Adaptive EQ\n• IPX4 sweat resistant\n• 6 hours listening\n• MagSafe compatible case\n• Like new condition\n• 1 month warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.inventory.insert_many(sample_products)
    
    # Seed default banners
    banner_count = await db.banners.count_documents({})
    if banner_count == 0:
        default_banners = [
            {
                "id": str(uuid.uuid4()),
                "image_url": "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1920&q=80",
                "title": "Latest iPhones",
                "subtitle": "Experience the power of Apple",
                "link": "/mobiles",
                "is_active": True,
                "order": 1,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1920&q=80",
                "title": "Samsung Galaxy Series",
                "subtitle": "Unleash your creativity",
                "link": "/mobiles",
                "is_active": True,
                "order": 2,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "image_url": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=1920&q=80",
                "title": "Premium Accessories",
                "subtitle": "Complete your setup",
                "link": "/accessories",
                "is_active": True,
                "order": 3,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.banners.insert_many(default_banners)
    
    return {"message": "Database seeded successfully", "count": len(sample_products)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
