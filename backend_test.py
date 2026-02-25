import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageDraw

class ProjectMonitoringAPITester:
    def __init__(self, base_url="https://agri-field-monitor.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.project_ids = []

    def log_test(self, name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ {name} - FAILED")
            if error:
                print(f"   Error: {error}")
        print("-" * 50)

    def create_test_image(self):
        """Create a test image with fake EXIF data"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='green')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), "Test Project", fill='white')
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_data = buffer.getvalue()
        b64_data = base64.b64encode(img_data).decode()
        
        return f"data:image/jpeg;base64,{b64_data}"

    def test_root_endpoint(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            self.log_test("Root Endpoint", success, data, 
                         f"Status: {response.status_code}" if not success else None)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, error=str(e))
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        try:
            response = requests.get(f"{self.base_url}/dashboard/stats")
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            # Validate expected fields
            if success and data:
                required_fields = ['total_projects', 'proposed', 'ongoing', 'completed', 'with_coordinates', 'without_coordinates']
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    error = f"Missing fields: {missing_fields}"
                else:
                    error = None
            else:
                error = f"Status: {response.status_code}"
            
            self.log_test("Dashboard Stats", success, data, error)
            return success
        except Exception as e:
            self.log_test("Dashboard Stats", False, error=str(e))
            return False

    def test_create_project(self):
        """Test project creation"""
        try:
            test_image = self.create_test_image()
            
            project_data = {
                "project_name": f"Test Project {datetime.now().strftime('%H%M%S')}",
                "beneficiary_name": "Test Beneficiary",
                "address": "123 Test Street, Bicol Region",
                "status": "Proposed",
                "coordinates": {"lat": 13.4213, "lng": 123.4139},
                "image_data": test_image
            }
            
            response = requests.post(f"{self.base_url}/projects", json=project_data)
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            if success and data and 'id' in data:
                self.project_ids.append(data['id'])
                # Validate response structure
                required_fields = ['id', 'project_name', 'beneficiary_name', 'address', 'status']
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    error = f"Missing response fields: {missing_fields}"
                else:
                    error = None
            else:
                error = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Create Project", success, data, error)
            return success
        except Exception as e:
            self.log_test("Create Project", False, error=str(e))
            return False

    def test_create_project_without_image(self):
        """Test project creation without image"""
        try:
            project_data = {
                "project_name": f"Test Project No Image {datetime.now().strftime('%H%M%S')}",
                "beneficiary_name": "Test Beneficiary No Image",
                "address": "456 Test Avenue, Bicol Region",
                "status": "Ongoing"
            }
            
            response = requests.post(f"{self.base_url}/projects", json=project_data)
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            if success and data and 'id' in data:
                self.project_ids.append(data['id'])
            
            self.log_test("Create Project (No Image)", success, data, 
                         f"Status: {response.status_code}" if not success else None)
            return success
        except Exception as e:
            self.log_test("Create Project (No Image)", False, error=str(e))
            return False

    def test_get_projects(self):
        """Test getting all projects"""
        try:
            response = requests.get(f"{self.base_url}/projects")
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            if success and isinstance(data, list):
                error = None
                print(f"   Found {len(data)} projects")
            else:
                error = f"Status: {response.status_code}, Expected list"
            
            self.log_test("Get All Projects", success, 
                         {"count": len(data)} if success else None, error)
            return success
        except Exception as e:
            self.log_test("Get All Projects", False, error=str(e))
            return False

    def test_get_projects_with_filters(self):
        """Test getting projects with filters"""
        try:
            # Test status filter
            response = requests.get(f"{self.base_url}/projects?status=Proposed")
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            self.log_test("Get Projects (Status Filter)", success, 
                         {"count": len(data)} if success else None,
                         f"Status: {response.status_code}" if not success else None)
            
            # Test search filter
            response2 = requests.get(f"{self.base_url}/projects?search=Test")
            success2 = response2.status_code == 200
            data2 = response2.json() if response2.status_code == 200 else None
            
            self.log_test("Get Projects (Search Filter)", success2, 
                         {"count": len(data2)} if success2 else None,
                         f"Status: {response2.status_code}" if not success2 else None)
            
            return success and success2
        except Exception as e:
            self.log_test("Get Projects (Filters)", False, error=str(e))
            return False

    def test_get_single_project(self):
        """Test getting a single project"""
        if not self.project_ids:
            self.log_test("Get Single Project", False, error="No project IDs available")
            return False
        
        try:
            project_id = self.project_ids[0]
            response = requests.get(f"{self.base_url}/projects/{project_id}")
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            if success and data:
                # Validate response has expected fields
                if data.get('id') == project_id:
                    error = None
                else:
                    success = False
                    error = "Project ID mismatch"
            else:
                error = f"Status: {response.status_code}"
            
            self.log_test("Get Single Project", success, data, error)
            return success
        except Exception as e:
            self.log_test("Get Single Project", False, error=str(e))
            return False

    def test_update_project(self):
        """Test updating a project"""
        if not self.project_ids:
            self.log_test("Update Project", False, error="No project IDs available")
            return False
        
        try:
            project_id = self.project_ids[0]
            update_data = {
                "project_name": f"Updated Test Project {datetime.now().strftime('%H%M%S')}",
                "status": "Completed"
            }
            
            response = requests.put(f"{self.base_url}/projects/{project_id}", json=update_data)
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            if success and data:
                # Verify update was applied
                if data.get('project_name') == update_data['project_name'] and data.get('status') == update_data['status']:
                    error = None
                else:
                    success = False
                    error = "Update not reflected in response"
            else:
                error = f"Status: {response.status_code}"
            
            self.log_test("Update Project", success, data, error)
            return success
        except Exception as e:
            self.log_test("Update Project", False, error=str(e))
            return False

    def test_export_csv(self):
        """Test CSV export"""
        try:
            response = requests.get(f"{self.base_url}/export/csv")
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', '')
                if 'csv' in content_type.lower() or 'text' in content_type.lower():
                    # Check if response contains CSV data
                    csv_content = response.text
                    lines = csv_content.split('\n')
                    if len(lines) >= 1 and 'Project Name' in lines[0]:
                        error = None
                        data = {"lines": len(lines), "header": lines[0]}
                    else:
                        success = False
                        error = "Invalid CSV format"
                        data = None
                else:
                    success = False
                    error = f"Wrong content type: {content_type}"
                    data = None
            else:
                error = f"Status: {response.status_code}"
                data = None
            
            self.log_test("Export CSV", success, data, error)
            return success
        except Exception as e:
            self.log_test("Export CSV", False, error=str(e))
            return False

    def test_export_pdf(self):
        """Test PDF export"""
        try:
            response = requests.get(f"{self.base_url}/export/pdf")
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', '')
                if 'pdf' in content_type.lower():
                    # Check if response contains PDF data (starts with %PDF)
                    pdf_content = response.content
                    if pdf_content.startswith(b'%PDF'):
                        error = None
                        data = {"size_bytes": len(pdf_content)}
                    else:
                        success = False
                        error = "Invalid PDF format"
                        data = None
                else:
                    success = False
                    error = f"Wrong content type: {content_type}"
                    data = None
            else:
                error = f"Status: {response.status_code}"
                data = None
            
            self.log_test("Export PDF", success, data, error)
            return success
        except Exception as e:
            self.log_test("Export PDF", False, error=str(e))
            return False

    def test_delete_project(self):
        """Test deleting a project"""
        if not self.project_ids:
            self.log_test("Delete Project", False, error="No project IDs available")
            return False
        
        try:
            # Use the last project ID for deletion
            project_id = self.project_ids.pop()
            response = requests.delete(f"{self.base_url}/projects/{project_id}")
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else None
            
            # Verify deletion by trying to get the project
            if success:
                verify_response = requests.get(f"{self.base_url}/projects/{project_id}")
                if verify_response.status_code == 404:
                    error = None
                else:
                    success = False
                    error = "Project not actually deleted"
            else:
                error = f"Status: {response.status_code}"
            
            self.log_test("Delete Project", success, data, error)
            return success
        except Exception as e:
            self.log_test("Delete Project", False, error=str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Project Monitoring API Tests")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_root_endpoint():
            print("❌ API not accessible. Stopping tests.")
            return False
        
        # Dashboard functionality
        self.test_dashboard_stats()
        
        # Project CRUD operations
        self.test_create_project()
        self.test_create_project_without_image()
        self.test_get_projects()
        self.test_get_projects_with_filters()
        self.test_get_single_project()
        self.test_update_project()
        
        # Export functionality
        self.test_export_csv()
        self.test_export_pdf()
        
        # Delete functionality (test last to preserve data for other tests)
        self.test_delete_project()
        
        # Clean up remaining test projects
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"🏁 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📊 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

    def cleanup_test_data(self):
        """Clean up any remaining test projects"""
        print("\n🧹 Cleaning up test data...")
        for project_id in self.project_ids:
            try:
                requests.delete(f"{self.base_url}/projects/{project_id}")
                print(f"   Deleted test project: {project_id}")
            except Exception as e:
                print(f"   Failed to delete project {project_id}: {e}")

def main():
    tester = ProjectMonitoringAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())