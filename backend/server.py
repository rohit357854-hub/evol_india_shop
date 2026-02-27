from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_name: str
    brand: str
    price: float
    condition: str  # "New" or "Pre-owned"
    main_image: str
    specifications: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryItemCreate(BaseModel):
    product_name: str
    brand: str
    price: float
    condition: str
    main_image: str
    specifications: str

class InventoryItemUpdate(BaseModel):
    product_name: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None
    main_image: Optional[str] = None
    specifications: Optional[str] = None

# Status check models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Mobile Shop Inventory API"}

# Status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Inventory CRUD endpoints
@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_all_inventory():
    """Get all inventory items"""
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
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
    return item

@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item: InventoryItemCreate):
    """Create a new inventory item"""
    item_obj = InventoryItem(**item.model_dump())
    doc = item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.inventory.insert_one(doc)
    return item_obj

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: str, item_update: InventoryItemUpdate):
    """Update an existing inventory item"""
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
    return updated

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str):
    """Delete an inventory item"""
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Get unique brands
@api_router.get("/brands", response_model=List[str])
async def get_brands():
    """Get all unique brands"""
    brands = await db.inventory.distinct("brand")
    return brands

# Seed data endpoint
@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample products"""
    count = await db.inventory.count_documents({})
    if count > 0:
        return {"message": "Database already seeded", "count": count}
    
    sample_products = [
        {
            "id": str(uuid.uuid4()),
            "product_name": "iPhone 15 Pro Max",
            "brand": "Apple",
            "price": 159900,
            "condition": "New",
            "main_image": "https://images.unsplash.com/photo-1695822877321-15ef5412b82e?w=800&q=80",
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
            "main_image": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
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
            "main_image": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
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
            "main_image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
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
            "main_image": "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80",
            "specifications": "• Snapdragon 8 Gen 3\n• 6.73-inch LTPO AMOLED\n• Leica quad camera\n• 90W wired + 80W wireless\n• 512GB Storage\n• HyperOS\n• Variable aperture",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "iPhone 14 Pro",
            "brand": "Apple",
            "price": 89999,
            "condition": "Pre-owned",
            "main_image": "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=800&q=80",
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
            "main_image": "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&q=80",
            "specifications": "• Snapdragon 8 Gen 2\n• 6.1-inch Dynamic AMOLED\n• 50MP main camera\n• 128GB Storage\n• Very good condition\n• Original box included\n• 2 months warranty",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "product_name": "Oppo Find X7 Ultra",
            "brand": "Oppo",
            "price": 84999,
            "condition": "New",
            "main_image": "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&q=80",
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
            "main_image": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&q=80",
            "specifications": "• Dimensity 9300\n• 6.78-inch LTPO AMOLED\n• ZEISS camera system\n• 100W FlashCharge\n• 256GB Storage\n• Funtouch OS 14\n• 5400mAh battery",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.inventory.insert_many(sample_products)
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
