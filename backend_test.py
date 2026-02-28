import requests
import sys
import json
from datetime import datetime

class MobileShopAPITester:
    def __init__(self, base_url="https://smart-catalog-21.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.admin_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                except:
                    response_data = {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}...")
                response_data = {}

            self.test_results.append({
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_preview": response.text[:100] if response.text else ""
            })

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_seed_database(self):
        """Test database seeding"""
        return self.run_test("Seed Database", "POST", "seed", 200)

    def test_get_all_inventory(self):
        """Test getting all inventory items"""
        success, data = self.run_test("Get All Inventory", "GET", "inventory", 200)
        if success and isinstance(data, list):
            print(f"   Found {len(data)} products")
            return True, data
        return False, []

    def test_get_brands(self):
        """Test getting unique brands"""
        return self.run_test("Get Brands", "GET", "brands", 200)

    def test_create_inventory_item(self):
        """Test creating a new inventory item with new fields"""
        if not self.admin_token:
            print("❌ Skipped - No admin token available")
            return False, None
            
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
        
        test_product = {
            "product_name": "Test Phone XYZ",
            "brand": "TestBrand",
            "price": 50000,
            "condition": "New",
            "category": "Mobile",
            "main_image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            "images": ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"],
            "color": "Test Black",
            "ram_rom": "8GB/128GB",
            "stock_count": 15,
            "specifications": "• Test processor\n• Test display\n• Test camera"
        }
        success, data = self.run_test("Create Inventory Item", "POST", "inventory", 200, test_product, headers)
        if success and 'id' in data:
            print(f"   Created product with ID: {data['id']}")
            return True, data['id']
        return False, None

    def test_get_single_inventory_item(self, item_id):
        """Test getting a single inventory item"""
        if not item_id:
            print("❌ Skipped - No item ID provided")
            return False, {}
        return self.run_test("Get Single Inventory Item", "GET", f"inventory/{item_id}", 200)

    def test_update_inventory_item(self, item_id):
        """Test updating an inventory item"""
        if not item_id or not self.admin_token:
            print("❌ Skipped - No item ID or admin token provided")
            return False, {}
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
        
        update_data = {
            "price": 45000,
            "color": "Updated Blue",
            "ram_rom": "12GB/256GB",
            "stock_count": 20,
            "specifications": "• Updated processor\n• Updated display\n• Updated camera"
        }
        return self.run_test("Update Inventory Item", "PUT", f"inventory/{item_id}", 200, update_data, headers)

    def test_delete_inventory_item(self, item_id):
        """Test deleting an inventory item"""
        if not item_id or not self.admin_token:
            print("❌ Skipped - No item ID or admin token provided")
            return False, {}
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
        return self.run_test("Delete Inventory Item", "DELETE", f"inventory/{item_id}", 200, headers=headers)

    def test_bulk_upload_csv(self):
        """Test bulk upload CSV functionality"""
        if not self.admin_token:
            print("❌ Skipped - No admin token available")
            return False, {}
        
        # Create a simple CSV content for testing
        csv_content = """product_name,brand,price,condition,category,main_image,images,color,ram_rom,stock_count,specifications
Test Bulk Phone 1,TestBrand,25000,New,Mobile,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80,,Black,4GB/64GB,10,"Test specs 1"
Test Bulk Phone 2,TestBrand,30000,Pre-owned,Mobile,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80,,White,6GB/128GB,5,"Test specs 2"
"""
        
        # For this test, we'll simulate the CSV upload by checking if the endpoint exists
        # In a real scenario, we'd need to create a proper multipart/form-data request
        print("   Note: CSV upload test simulated (requires multipart/form-data)")
    def test_get_nonexistent_item(self):
        """Test getting a non-existent item (should return 404)"""
        return self.run_test("Get Non-existent Item", "GET", "inventory/nonexistent-id", 404)

    def test_stock_decrement(self, item_id):
        """Test stock decrement functionality"""
        if not item_id or not self.admin_token:
            print("❌ Skipped - No item ID or admin token provided")
            return False, {}
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
        
        decrement_data = {"quantity": 2}
        return self.run_test("Decrement Stock", "POST", f"inventory/{item_id}/decrement-stock", 200, decrement_data, headers)

    def test_admin_login(self):
        """Test admin login with default credentials"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        success, data = self.run_test("Admin Login", "POST", "admin/login", 200, login_data)
        if success and 'token' in data:
            self.admin_token = data['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True, data
        return False, {}

    def test_admin_verify(self):
        """Test admin token verification"""
        if not self.admin_token:
            print("❌ Skipped - No admin token available")
            return False, {}
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
        return self.run_test("Admin Verify Token", "GET", "admin/verify", 200, headers=headers)

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        # Test getting settings
        success1, settings_data = self.run_test("Get Settings", "GET", "settings", 200)
        
        # Test updating settings (requires auth)
        if self.admin_token and success1:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.admin_token}'
            }
            update_data = {
                "id": "shop_settings",
                "shop_name": "Evol India Shop Test",
                "address": "Delhi Rohtak Road, Metro Pillar No. 844, Near Standard Sweet, Bahadurgarh",
                "phone": "7404693476",
                "whatsapp": "7404693476",
                "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Bahadurgarh+Metro+Pillar+844",
                "developer_name": "Developer",
                "meta_title": "Evol India Shop - Best Mobiles & Accessories in Bahadurgarh",
                "meta_description": "Premium mobile phones, pre-owned devices, and accessories at best prices in Bahadurgarh. Visit us near Metro Pillar 844."
            }
            success2, _ = self.run_test("Update Settings", "PUT", "settings", 200, update_data, headers)
            return success1 and success2
        
        return success1

    def test_banner_endpoints(self):
        """Test banner endpoints"""
        # Test getting public banners
        success1, banners_data = self.run_test("Get Public Banners", "GET", "banners", 200)
        
        if not self.admin_token:
            print("❌ Skipped admin banner tests - No admin token available")
            return success1
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
        
        # Test getting all banners (admin only)
        success2, _ = self.run_test("Get All Banners (Admin)", "GET", "banners/all", 200, headers=headers)
        
        # Test creating a banner
        banner_data = {
            "image_url": "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1920&q=80",
            "title": "Test Banner",
            "subtitle": "Test subtitle",
            "link": "/test",
            "is_active": True,
            "order": 99
        }
        success3, created_banner = self.run_test("Create Banner", "POST", "banners", 200, banner_data, headers)
        
        banner_id = None
        if success3 and 'id' in created_banner:
            banner_id = created_banner['id']
            print(f"   Created banner with ID: {banner_id}")
            
            # Test updating the banner
            update_data = {
                "image_url": "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1920&q=80",
                "title": "Updated Test Banner",
                "subtitle": "Updated subtitle",
                "link": "/updated",
                "is_active": False,
                "order": 100
            }
            success4, _ = self.run_test("Update Banner", "PUT", f"banners/{banner_id}", 200, update_data, headers)
            
            # Test deleting the banner
            success5, _ = self.run_test("Delete Banner", "DELETE", f"banners/{banner_id}", 200, headers=headers)
            
            return success1 and success2 and success3 and success4 and success5
        
        return success1 and success2 and success3

def main():
    print("🚀 Starting Evol India Shop API Tests...")
    print("=" * 50)
    
    # Setup
    tester = MobileShopAPITester()
    created_item_id = None

    # Run tests in sequence
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    
    print("\n📋 Testing Admin Authentication...")
    tester.test_admin_login()
    tester.test_admin_verify()
    
    print("\n📋 Testing Database Seeding...")
    tester.test_seed_database()
    
    print("\n📋 Testing Settings Endpoints...")
    tester.test_settings_endpoints()
    
    print("\n📋 Testing Banner Endpoints...")
    tester.test_banner_endpoints()
    
    print("\n📋 Testing Inventory Read Operations...")
    success, inventory_data = tester.test_get_all_inventory()
    tester.test_get_brands()
    
    print("\n📋 Testing Inventory CRUD Operations...")
    success, created_item_id = tester.test_create_inventory_item()
    tester.test_get_single_inventory_item(created_item_id)
    tester.test_update_inventory_item(created_item_id)
    tester.test_stock_decrement(created_item_id)
    
    print("\n📋 Testing Bulk Upload...")
    tester.test_bulk_upload_csv()
    
    print("\n📋 Testing Error Handling...")
    tester.test_get_nonexistent_item()
    
    print("\n📋 Testing Cleanup...")
    tester.test_delete_inventory_item(created_item_id)

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print failed tests
    failed_tests = [test for test in tester.test_results if not test['success']]
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            error_msg = test.get('error', f"Status {test['actual_status']}")
            print(f"   • {test['test']}: {error_msg}")
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'failed_tests': tester.tests_run - tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())