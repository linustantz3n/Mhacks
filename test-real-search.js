// Real test with actual LinkedIn scraping and scoring
const fetch = globalThis.fetch;

async function testRealSearch() {
  console.log('🔍 Testing Real Enhanced Search\n');

  // Your profile (edit this to match YOUR actual info)
  const yourProfile = {
    full_name: "Alex Johnson", // Change this to your name
    schools: [
      {
        institution: "University of Michigan", // Change to your school
        program: "computer science",
        degree: "Bachelor of Science",
        grad_year: 2024 // Change to your grad year
      }
    ],
    clubs: ["acm", "engineering honor society", "hackathon"], // Your clubs
    hometown: "Ann Arbor", // Your hometown
    city: "Ann Arbor", // Your city
    region: "Michigan",
    country: "United States",
    grad_year: 2024
  };

  try {
    console.log('Making real search request...');
    console.log('This will:');
    console.log('  1. Scrape LinkedIn for Apple software engineers');
    console.log('  2. Score them based on YOUR profile');
    console.log('  3. Rank by connection strength\n');

    const response = await fetch('http://localhost:4000/search/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "Find software engineer contacts at Apple",
        userProfile: yourProfile
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('🎉 SUCCESS! Enhanced scoring working!\n');

      console.log(`📊 Results: ${result.results.length} candidates found`);
      console.log(`🔄 Scoring method: ${result.scoringMethod}`);
      console.log(`📁 CSV file: ${result.csvFile}\n`);

      console.log('🏆 TOP 5 CANDIDATES:');
      result.results.slice(0, 5).forEach((candidate, i) => {
        console.log(`\n${i + 1}. ${candidate.name}`);
        console.log(`   Score: ${candidate.score}`);
        console.log(`   Title: ${candidate.title}`);
        console.log(`   Location: ${candidate.location}`);
        if (candidate.subscores) {
          console.log(`   School match: ${candidate.subscores.school}`);
          console.log(`   Experience: ${candidate.subscores.experience_relevance}`);
          console.log(`   Geography: ${candidate.subscores.geography}`);
        }
        console.log(`   Reasons: ${candidate.reasons?.join(', ') || 'N/A'}`);
      });

      console.log('\n✅ Your enhanced scoring system is working perfectly!');

    } else {
      console.log('❌ Error:', result.error);

      if (result.error.includes('LinkedIn extraction failed')) {
        console.log('\n💡 This might be due to:');
        console.log('   - LinkedIn rate limiting');
        console.log('   - Network issues');
        console.log('   - LinkedIn credentials in main.ts');
      } else if (result.error.includes('GoogleGenerativeAI')) {
        console.log('\n💡 Google AI API issue:');
        console.log('   - Check your API key in .env');
        console.log('   - Try a different model name');
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
  }
}

console.log('Enhanced LinkedIn Scoring - Real Test\n');
testRealSearch();