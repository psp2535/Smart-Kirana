const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './.env' });

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    // Test both v1 and v1beta
    for (const apiVersion of ['v1', 'v1beta']) {
      console.log(`--- API Version: ${apiVersion} ---`);
      const genAIConfig = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '', { apiVersion });
      
      // Note: listModels is not directly on genAI in some versions of the SDK
      // It might be on the client or requires a different approach.
      // Actually, in @google/generative-ai, there isn't a direct listModels yet?
      // Wait, let's check the docs or try a simple test.
      
      try {
        const model = genAIConfig.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent("test");
        console.log(`gemini-1.5-flash on ${apiVersion}: SUCCESS`);
      } catch (e) {
        console.log(`gemini-1.5-flash on ${apiVersion}: FAILED - ${e.message}`);
      }

      try {
        const model = genAIConfig.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const result = await model.generateContent("test");
        console.log(`gemini-1.5-flash-latest on ${apiVersion}: SUCCESS`);
      } catch (e) {
        console.log(`gemini-1.5-flash-latest on ${apiVersion}: FAILED - ${e.message}`);
      }

      try {
        const model = genAIConfig.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent("test");
        console.log(`gemini-1.5-pro on ${apiVersion}: SUCCESS`);
      } catch (e) {
        console.log(`gemini-1.5-pro on ${apiVersion}: FAILED - ${e.message}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();
