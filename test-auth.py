#!/usr/bin/env python3
"""
Test login and registration functionality using browser-use
"""
import asyncio
import uuid
from browser_use import Agent, Browser, BrowserConfig

async def test_auth():
    # Generate unique test email
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "TestPassword123!"
    test_name = "Test User"
    
    print(f"🧪 Testing with email: {test_email}")
    
    browser = Browser(config=BrowserConfig(headless=False))
    
    try:
        # Test 1: Registration
        print("\n📋 Test 1: User Registration")
        agent = Agent(
            task=f"""
            Go to http://localhost:3000/register
            Fill in the registration form:
            - Email: {test_email}
            - Display Name: {test_name}
            - Password: {test_password}
            - Confirm Password: {test_password}
            Click the "注册" (Register) button
            Wait for the page to show registration success or verification prompt
            Take a screenshot and save to output/test-register-result.png
            Return whether registration was successful
            """,
            browser=browser,
        )
        result = await agent.run()
        print(f"   Registration result: {result}")
        
        # Wait a moment
        await asyncio.sleep(3)
        
        # Test 2: Login with the new account
        print("\n📋 Test 2: User Login")
        agent2 = Agent(
            task=f"""
            Go to http://localhost:3000/login
            Fill in the login form:
            - Email: {test_email}
            - Password: {test_password}
            Click the "登录" (Login) button
            Wait for redirect to dashboard
            Check if we are on the dashboard page
            Take a screenshot and save to output/test-login-result.png
            Return whether login was successful
            """,
            browser=browser,
        )
        result2 = await agent2.run()
        print(f"   Login result: {result2}")
        
        print("\n✅ Tests completed!")
        print(f"   Test email: {test_email}")
        print(f"   Test password: {test_password}")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
    finally:
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_auth())
