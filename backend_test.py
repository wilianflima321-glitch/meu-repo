import requests
import sys
import json
from datetime import datetime

class IDEBackendTester:
    def __init__(self, base_url="https://nexus-devtools.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.project_id = None
        self.file_id = None
        self.conversation_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_create_project(self):
        """Test project creation"""
        success, response = self.run_test(
            "Create Project",
            "POST",
            "api/projects",
            200,
            data={
                "name": f"test-project-{datetime.now().strftime('%H%M%S')}",
                "description": "Test project for IDE",
                "template": "react"
            }
        )
        if success and response.get('project', {}).get('id'):
            self.project_id = response['project']['id']
            print(f"   Project ID: {self.project_id}")
        return success

    def test_list_projects(self):
        """Test listing projects"""
        return self.run_test("List Projects", "GET", "api/projects", 200)

    def test_get_project(self):
        """Test getting specific project"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test("Get Project", "GET", f"api/projects/{self.project_id}", 200)

    def test_get_file_tree(self):
        """Test getting file tree"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test("Get File Tree", "GET", f"api/projects/{self.project_id}/file-tree", 200)

    def test_create_file(self):
        """Test creating a file"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        success, response = self.run_test(
            "Create File",
            "POST",
            f"api/projects/{self.project_id}/files",
            200,
            data={
                "name": "test.js",
                "type": "file",
                "content": "console.log('Hello World');"
            }
        )
        if success and response.get('id'):
            self.file_id = response['id']
            print(f"   File ID: {self.file_id}")
        return success

    def test_get_file(self):
        """Test getting a file"""
        if not self.file_id:
            print("❌ Skipped - No file ID available")
            return False
        return self.run_test("Get File", "GET", f"api/files/{self.file_id}", 200)

    def test_update_file(self):
        """Test updating a file"""
        if not self.file_id:
            print("❌ Skipped - No file ID available")
            return False
        return self.run_test(
            "Update File",
            "PUT",
            f"api/files/{self.file_id}",
            200,
            data={"content": "console.log('Updated content');"}
        )

    def test_terminal_execute(self):
        """Test terminal command execution"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test(
            "Execute Terminal Command",
            "POST",
            f"api/projects/{self.project_id}/terminal/execute",
            200,
            data={"command": "echo 'Hello from terminal'"}
        )

    def test_ai_query(self):
        """Test AI assistant query"""
        success, response = self.run_test(
            "AI Query",
            "POST",
            "api/ai/query",
            200,
            data={
                "query": "explain this code",
                "context": "console.log('test');"
            }
        )
        if success and response.get('conversation_id'):
            self.conversation_id = response['conversation_id']
        return success

    def test_git_status(self):
        """Test git status"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test("Git Status", "GET", f"api/projects/{self.project_id}/git/status", 200)

    def test_git_branches(self):
        """Test git branches"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test("Git Branches", "GET", f"api/projects/{self.project_id}/git/branches", 200)

    def test_git_commits(self):
        """Test git commits"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test("Git Commits", "GET", f"api/projects/{self.project_id}/git/commits", 200)

    def test_extensions(self):
        """Test extensions list"""
        return self.run_test("List Extensions", "GET", "api/extensions", 200)

    def test_themes(self):
        """Test themes list"""
        return self.run_test("List Themes", "GET", "api/themes", 200)

    def test_settings(self):
        """Test settings"""
        return self.run_test("Get Settings", "GET", "api/settings", 200)

    def test_snippets(self):
        """Test snippets"""
        return self.run_test("List Snippets", "GET", "api/snippets", 200)

    def test_search(self):
        """Test search functionality"""
        if not self.project_id:
            print("❌ Skipped - No project ID available")
            return False
        return self.run_test(
            "Search Files",
            "POST",
            f"api/projects/{self.project_id}/search",
            200,
            data={"query": "console", "include_content": True}
        )

def main():
    print("🚀 Starting AI IDE Platform Backend Tests")
    print("=" * 50)
    
    tester = IDEBackendTester()
    
    # Core API Tests
    tests = [
        tester.test_health_check,
        tester.test_extensions,
        tester.test_themes,
        tester.test_settings,
        tester.test_snippets,
        tester.test_create_project,
        tester.test_list_projects,
        tester.test_get_project,
        tester.test_get_file_tree,
        tester.test_create_file,
        tester.test_get_file,
        tester.test_update_file,
        tester.test_terminal_execute,
        tester.test_ai_query,
        tester.test_git_status,
        tester.test_git_branches,
        tester.test_git_commits,
        tester.test_search,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend tests mostly successful!")
        return 0
    elif success_rate >= 50:
        print("⚠️  Backend has some issues but core functionality works")
        return 1
    else:
        print("❌ Backend has major issues")
        return 2

if __name__ == "__main__":
    sys.exit(main())