#!/usr/bin/env python3
"""
Backend API Testing for CRM Propostas App
Tests authentication system and Supabase integration
"""

import requests
import json
import os
import sys
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://proposal-hub-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test credentials from database setup
TEST_CREDENTIALS = [
    {"email": "gestor@empresa.com", "password": "123456", "role": "gestor"},
    {"email": "joao@empresa.com", "password": "123456", "role": "analista"}
]

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'CRM-Backend-Tester/1.0'
        })
        self.test_results = []
        self.current_user = None
        self.session_id = None

    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                if data.get('message') == "CRM Propostas API":
                    self.log_result("API Root", True, "API root endpoint responding correctly")
                    return True
                else:
                    self.log_result("API Root", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("API Root", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("API Root", False, f"Connection error: {str(e)}")
            return False

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication System ===")
        
        # Test with invalid credentials first
        try:
            invalid_payload = {"email": "invalid@test.com", "password": "wrongpass"}
            response = self.session.post(f"{API_BASE}/auth/login", json=invalid_payload)
            
            if response.status_code == 401:
                self.log_result("Auth - Invalid Credentials", True, "Correctly rejected invalid credentials")
            else:
                self.log_result("Auth - Invalid Credentials", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth - Invalid Credentials", False, f"Error: {str(e)}")

        # Test with valid credentials
        for cred in TEST_CREDENTIALS:
            try:
                payload = {"email": cred["email"], "password": cred["password"]}
                response = self.session.post(f"{API_BASE}/auth/login", json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'user' in data and 'sessionId' in data:
                        user = data['user']
                        if user.get('email') == cred['email'] and user.get('tipo_usuario') == cred['role']:
                            self.log_result(f"Auth - Login {cred['role']}", True, 
                                          f"Successfully logged in as {user['nome']} ({user['tipo_usuario']})")
                            # Store session for further tests
                            if cred['role'] == 'gestor':
                                self.current_user = user
                                self.session_id = data.get('sessionId')
                            return True
                        else:
                            self.log_result(f"Auth - Login {cred['role']}", False, 
                                          f"User data mismatch: {user}")
                            return False
                    else:
                        self.log_result(f"Auth - Login {cred['role']}", False, 
                                      f"Missing user or sessionId in response: {data}")
                        return False
                else:
                    self.log_result(f"Auth - Login {cred['role']}", False, 
                                  f"HTTP {response.status_code}: {response.text}")
                    return False
            except Exception as e:
                self.log_result(f"Auth - Login {cred['role']}", False, f"Error: {str(e)}")
                return False
        
        return True

    def test_users_endpoint(self):
        """Test users API endpoint"""
        print("\n=== Testing Users API ===")
        
        try:
            response = self.session.get(f"{API_BASE}/users")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if we have the expected users
                    emails = [user.get('email') for user in data]
                    expected_emails = ['gestor@empresa.com', 'joao@empresa.com']
                    
                    found_users = [email for email in expected_emails if email in emails]
                    if len(found_users) >= 2:
                        self.log_result("Users API", True, 
                                      f"Successfully retrieved {len(data)} users including test accounts")
                        return True
                    else:
                        self.log_result("Users API", False, 
                                      f"Missing expected test users. Found: {emails}")
                        return False
                else:
                    self.log_result("Users API", False, f"Empty or invalid user list: {data}")
                    return False
            else:
                self.log_result("Users API", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Users API", False, f"Error: {str(e)}")
            return False

    def test_proposals_endpoint(self):
        """Test proposals API endpoints"""
        print("\n=== Testing Proposals API ===")
        
        # Test GET proposals
        try:
            response = self.session.get(f"{API_BASE}/proposals")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Proposals GET", True, 
                                  f"Successfully retrieved {len(data)} proposals")
                    
                    # Test POST - Create new proposal (if we have a logged in user)
                    if self.current_user:
                        test_proposal = {
                            "cnpj": "12345678000195",
                            "consultor": "Test Consultor",
                            "operadora": "unimed recife",
                            "quantidade_vidas": 25,
                            "valor": 15000.00,
                            "previsao_implantacao": "2024-12-31",
                            "status": "em análise",
                            "criado_por": self.current_user['id']
                        }
                        
                        create_response = self.session.post(f"{API_BASE}/proposals", json=test_proposal)
                        if create_response.status_code == 200:
                            created_data = create_response.json()
                            if 'id' in created_data:
                                self.log_result("Proposals POST", True, 
                                              f"Successfully created proposal with ID: {created_data['id']}")
                                return True
                            else:
                                self.log_result("Proposals POST", False, 
                                              f"Created proposal missing ID: {created_data}")
                                return False
                        else:
                            self.log_result("Proposals POST", False, 
                                          f"Failed to create proposal: HTTP {create_response.status_code}")
                            return False
                    else:
                        self.log_result("Proposals POST", False, "No authenticated user for testing proposal creation")
                        return False
                else:
                    self.log_result("Proposals GET", False, f"Invalid proposals data: {data}")
                    return False
            else:
                self.log_result("Proposals GET", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Proposals API", False, f"Error: {str(e)}")
            return False

    def test_goals_endpoint(self):
        """Test goals/metas API endpoint"""
        print("\n=== Testing Goals API ===")
        
        try:
            response = self.session.get(f"{API_BASE}/goals")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Goals API", True, 
                                  f"Successfully retrieved {len(data)} user goals")
                    return True
                else:
                    self.log_result("Goals API", False, f"Invalid goals data: {data}")
                    return False
            else:
                self.log_result("Goals API", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Goals API", False, f"Error: {str(e)}")
            return False

    def test_sessions_endpoint(self):
        """Test sessions API endpoint"""
        print("\n=== Testing Sessions API ===")
        
        try:
            response = self.session.get(f"{API_BASE}/sessions")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Sessions API", True, 
                                  f"Successfully retrieved {len(data)} session records")
                    return True
                else:
                    self.log_result("Sessions API", False, f"Invalid sessions data: {data}")
                    return False
            else:
                self.log_result("Sessions API", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Sessions API", False, f"Error: {str(e)}")
            return False

    def test_cnpj_validation(self):
        """Test CNPJ validation endpoint"""
        print("\n=== Testing CNPJ Validation ===")
        
        try:
            # Test with a valid CNPJ format
            test_cnpj = {"cnpj": "11222333000181"}
            response = self.session.post(f"{API_BASE}/validate-cnpj", json=test_cnpj)
            
            if response.status_code == 200:
                data = response.json()
                if 'valid' in data:
                    self.log_result("CNPJ Validation", True, 
                                  f"CNPJ validation endpoint working. Result: {data.get('valid')}")
                    return True
                else:
                    self.log_result("CNPJ Validation", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("CNPJ Validation", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("CNPJ Validation", False, f"Error: {str(e)}")
            return False

    def test_logout(self):
        """Test logout functionality"""
        print("\n=== Testing Logout ===")
        
        if self.session_id:
            try:
                logout_payload = {"sessionId": self.session_id}
                response = self.session.post(f"{API_BASE}/auth/logout", json=logout_payload)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        self.log_result("Auth - Logout", True, "Successfully logged out")
                        return True
                    else:
                        self.log_result("Auth - Logout", False, f"Logout failed: {data}")
                        return False
                else:
                    self.log_result("Auth - Logout", False, f"HTTP {response.status_code}: {response.text}")
                    return False
            except Exception as e:
                self.log_result("Auth - Logout", False, f"Error: {str(e)}")
                return False
        else:
            self.log_result("Auth - Logout", False, "No session ID available for logout test")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for CRM Propostas")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🔗 API Base: {API_BASE}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_api_root,
            self.test_authentication,
            self.test_users_endpoint,
            self.test_proposals_endpoint,
            self.test_goals_endpoint,
            self.test_sessions_endpoint,
            self.test_cnpj_validation,
            self.test_logout
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        # Print summary
        print("\n📋 Detailed Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        return passed, total, self.test_results

def main():
    """Main test execution"""
    tester = BackendTester()
    passed, total, results = tester.run_all_tests()
    
    # Return exit code based on results
    if passed == total:
        print(f"\n🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        failed = total - passed
        print(f"\n⚠️  {failed} test(s) failed. Check the details above.")
        sys.exit(1)

if __name__ == "__main__":
    main()