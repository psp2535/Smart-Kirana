const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './.env' });

async function check() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API key found");
    return;
  }
  
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-pro'
  ];
  
  const versions = ['v1', 'v1beta'];
  
  for (const apiVersion of versions) {
    console.log(`\n--- Testing ${apiVersion} ---`);
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion });
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log(`[PASS] ${modelName} on ${apiVersion}`);
      } catch (e) {
        console.log(`[FAIL] ${modelName} on ${apiVersion}: ${e.message}`);
      }
    }
  }
}

check();
