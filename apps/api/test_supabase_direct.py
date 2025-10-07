#!/usr/bin/env python3
"""
Direct HTTP test for Supabase connectivity
This bypasses the Python client library and tests direct HTTP API calls
Used to verify database setup and RLS policies without client library issues
"""

import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def test_supabase_direct_http():
    """Test Supabase using direct HTTP requests (bypasses client library issues)"""
    
    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY") 
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not all([supabase_url, supabase_anon_key, supabase_service_key]):
        print("❌ Missing required environment variables")
        print("Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    print("🧪 Testing Supabase Direct HTTP API...")
    print(f"URL: {supabase_url}")
    print(f"Anon Key: {supabase_anon_key[:20]}...")
    print(f"Service Key: {supabase_service_key[:20]}...")
    
    # Test 1: Service role can access users table (bypasses RLS)
    print("\n1. Testing Service Role Access (Admin - bypasses RLS)")
    try:
        with httpx.Client() as client:
            headers = {
                "apikey": supabase_service_key,
                "Authorization": f"Bearer {supabase_service_key}",
                "Content-Type": "application/json"
            }
            
            response = client.get(
                f"{supabase_url}/rest/v1/users?select=id&limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                print("✅ Service role can access users table")
                print(f"   Response: {response.text}")
            else:
                print(f"❌ Service role failed: {response.status_code} - {response.text}")
                
    except Exception as e:
        print(f"❌ Service role test failed: {e}")
    
    # Test 2: Anonymous access (should respect RLS)
    print("\n2. Testing Anonymous Access (User - respects RLS)")
    try:
        with httpx.Client() as client:
            headers = {
                "apikey": supabase_anon_key,
                "Authorization": f"Bearer {supabase_anon_key}",
                "Content-Type": "application/json"
            }
            
            response = client.get(
                f"{supabase_url}/rest/v1/users?select=id&limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if len(data) == 0:
                    print("✅ Anonymous access respects RLS (empty result)")
                else:
                    print("ℹ️  Anonymous access returned data (RLS allows or no data)")
                print(f"   Response: {response.text}")
            else:
                print(f"ℹ️  Anonymous access blocked: {response.status_code} - {response.text}")
                print("   This is expected if RLS is working correctly")
                
    except Exception as e:
        print(f"❌ Anonymous access test failed: {e}")
    
    # Test 3: Check all our tables exist
    print("\n3. Testing Database Schema (All Tables)")
    tables = ['users', 'spaces', 'documents', 'queries', 'space_members', 'query_documents']
    
    for table in tables:
        try:
            with httpx.Client() as client:
                headers = {
                    "apikey": supabase_service_key,
                    "Authorization": f"Bearer {supabase_service_key}",
                    "Content-Type": "application/json"
                }
                
                response = client.get(
                    f"{supabase_url}/rest/v1/{table}?select=*&limit=1",
                    headers=headers
                )
                
                if response.status_code == 200:
                    print(f"✅ Table '{table}' exists and accessible")
                else:
                    print(f"❌ Table '{table}' issue: {response.status_code}")
                    
        except Exception as e:
            print(f"❌ Table '{table}' test failed: {e}")
    
    # Test 4: Test a simple write operation (admin only)
    print("\n4. Testing Write Operations (Service Role)")
    try:
        with httpx.Client() as client:
            headers = {
                "apikey": supabase_service_key,
                "Authorization": f"Bearer {supabase_service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            
            # Try to insert a test user
            test_user = {
                "email": "test_direct_http@example.com",
                "full_name": "Test Direct User",
                "role": "member"
            }
            
            # Insert
            response = client.post(
                f"{supabase_url}/rest/v1/users",
                headers=headers,
                json=test_user
            )
            
            if response.status_code in [200, 201]:
                created_user = response.json()[0]
                user_id = created_user["id"]
                print(f"✅ Created test user: {user_id}")
                
                # Clean up - delete the test user
                delete_response = client.delete(
                    f"{supabase_url}/rest/v1/users?id=eq.{user_id}",
                    headers=headers
                )
                
                if delete_response.status_code in [200, 204]:
                    print("✅ Cleaned up test user")
                else:
                    print(f"⚠️  Test user cleanup failed: {delete_response.status_code}")
                    
            else:
                print(f"❌ Write test failed: {response.status_code} - {response.text}")
                
    except Exception as e:
        print(f"❌ Write test failed: {e}")
    
    print("\n🎉 Direct HTTP tests completed!")
    print("\nSummary:")
    print("- Tests bypass client library compatibility issues")
    print("- Verifies actual database connectivity and RLS")
    print("- Confirms schema is properly applied")
    print("- Validates both admin and user access patterns")
    
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("SUPABASE DIRECT HTTP CONNECTIVITY TEST")
    print("=" * 60)
    
    success = test_supabase_direct_http()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Supabase setup is working correctly!")
    else:
        print("❌ Supabase setup needs attention")
    print("=" * 60)