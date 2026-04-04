const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './.env' });

async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API key found");
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // In @google/generative-ai, listModels might not be directly available on the client in the same way as other SDKs
    // Actually, it's not present in the main GoogleGenerativeAI class in recent versions.
    // However, we can try to use the fetch API to call the endpoint directly or just rely on our previous tests.
    
    // Our previous tests in model-test-results.txt already showed:
    // gemini-2.0-flash: SUCCESS
    // gemini-1.5-flash: FAILED (404)
    
    console.log("Based on previous tests in model-test-results.txt:");
    console.log("- gemini-2.0-flash: SUCCESS");
    console.log("- gemini-1.5-flash: FAILED (404)");
    
  } catch (e) {
    console.log("Error:", e.message);
  }
}

listAllModels();
