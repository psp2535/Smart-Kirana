const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './.env' });

async function check() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API key found");
    return;
  }
  
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  
  for (const modelName of modelsToTest) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test");
      console.log(`[PASS] ${modelName}`);
    } catch (e) {
      console.log(`[FAIL] ${modelName}: ${e.message}`);
    }
  }
}

check();
