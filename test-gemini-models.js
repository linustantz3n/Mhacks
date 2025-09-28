// Test which Gemini models are available
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
  const apiKey = 'AIzaSyADf0erNnkiw4ntzuyo8lOAXuYqvtExqu8'; // Your API key

  const genAI = new GoogleGenerativeAI(apiKey);

  // Try different model names
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
    'models/gemini-pro'
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      console.log(`✅ ${modelName} WORKS!`);
      console.log(`Response: ${response.text().substring(0, 50)}...\n`);
      break; // Stop after finding a working model
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}...\n`);
    }
  }
}

testModels().catch(console.error);