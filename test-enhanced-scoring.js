// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch;

const API_BASE = 'http://localhost:4000';

// Test data
const testUserProfile = {
  full_name: "Alex Johnson",
  schools: [
    {
      institution: "University of Michigan",
      program: "computer science",
      degree: "Bachelor of Science",
      grad_year: 2024
    }
  ],
  clubs: ["acm", "engineering honor society", "hackathon"],
  hometown: "Ann Arbor",
  city: "Ann Arbor",
  region: "Michigan",
  country: "United States",
  grad_year: 2024
};

const testSearchPrompt = "Find software engineer contacts at Apple";

async function testEnhancedScoring() {
  console.log('🚀 Testing Enhanced Scoring System\n');

  try {
    // Test 1: Setup user profile
    console.log('1. Setting up user profile...');
    const profileResponse = await fetch(`${API_BASE}/profile/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserProfile)
    });

    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      console.log('✅ Profile setup successful');
      console.log(`   User: ${profileResult.user.name}`);
    } else {
      console.log('❌ Profile setup failed');
      const error = await profileResponse.text();
      console.log(`   Error: ${error}`);
    }

    // Test 2: Test enhanced search (without requiring actual LinkedIn scraping)
    console.log('\n2. Testing enhanced scoring endpoint...');
    console.log('   Note: This will fail without LinkedIn credentials, but we can test the API structure');

    const searchResponse = await fetch(`${API_BASE}/search/enhanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: testSearchPrompt,
        userProfile: testUserProfile
      })
    });

    const searchResult = await searchResponse.text();
    console.log(`   Response status: ${searchResponse.status}`);
    console.log(`   Response preview: ${searchResult.substring(0, 200)}...`);

    // Test 3: Check API health
    console.log('\n3. Checking API health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (healthResponse.ok) {
      console.log('✅ API is healthy');
    } else {
      console.log('❌ API health check failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkIfServerRunning() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('Enhanced Scoring System Test\n');

  const serverRunning = await checkIfServerRunning();

  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:4000');
    console.log('   Please start the server with: npm run dev');
    console.log('   Then run this test again.');
    return;
  }

  await testEnhancedScoring();

  console.log('\n📝 Summary:');
  console.log('   - Enhanced scoring system has been implemented');
  console.log('   - New endpoints: /profile/setup and /search/enhanced');
  console.log('   - Requires GOOGLE_AI_API_KEY for full LLM scoring');
  console.log('   - Falls back to simpler scoring if API key not available');
  console.log('\n🔧 To enable full functionality:');
  console.log('   1. Get a Google AI API key from https://aistudio.google.com/app/apikey');
  console.log('   2. Add GOOGLE_AI_API_KEY=your_key_here to your .env file');
  console.log('   3. Restart the server');
}

main().catch(console.error);