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
        """Test creating a new inventory item"""
        test_product = {
            "product_name": "Test Phone XYZ",
            "brand": "TestBrand",
            "price": 50000,
            "condition": "New",
            "main_image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            "specifications": "• Test processor\n• Test display\n• Test camera"
        }
        success, data = self.run_test("Create Inventory Item", "POST", "inventory", 200, test_product)
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
        if not item_id:
            print("❌ Skipped - No item ID provided")
            return False, {}
        
        update_data = {
            "price": 45000,
            "specifications": "• Updated processor\n• Updated display\n• Updated camera"
        }
        return self.run_test("Update Inventory Item", "PUT", f"inventory/{item_id}", 200, update_data)

    def test_delete_inventory_item(self, item_id):
        """Test deleting an inventory item"""
        if not item_id:
            print("❌ Skipped - No item ID provided")
            return False, {}
        return self.run_test("Delete Inventory Item", "DELETE", f"inventory/{item_id}", 200)

    def test_get_nonexistent_item(self):
        """Test getting a non-existent item (should return 404)"""
        return self.run_test("Get Non-existent Item", "GET", "inventory/nonexistent-id", 404)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test creating status check
        status_data = {"client_name": "test_client"}
        success1, _ = self.run_test("Create Status Check", "POST", "status", 200, status_data)
        
        # Test getting status checks
        success2, _ = self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success1 and success2

def main():
    print("🚀 Starting Mobile Shop API Tests...")
    print("=" * 50)
    
    # Setup
    tester = MobileShopAPITester()
    created_item_id = None

    # Run tests in sequence
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    tester.test_status_endpoints()
    
    print("\n📋 Testing Database Seeding...")
    tester.test_seed_database()
    
    print("\n📋 Testing Inventory Read Operations...")
    success, inventory_data = tester.test_get_all_inventory()
    tester.test_get_brands()
    
    print("\n📋 Testing Inventory CRUD Operations...")
    success, created_item_id = tester.test_create_inventory_item()
    tester.test_get_single_inventory_item(created_item_id)
    tester.test_update_inventory_item(created_item_id)
    
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