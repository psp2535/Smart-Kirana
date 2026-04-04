const fs = require('fs');
require('dotenv').config({ path: './.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName, apiVersion = 'v1beta') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '', { apiVersion });
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say 'ready'");
    const text = result.response.text();
    return `${modelName} (${apiVersion}): SUCCESS - ${text}\n`;
  } catch (error) {
    return `${modelName} (${apiVersion}): FAILED - ${error.message}\n`;
  }
}

async function runTests() {
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp'
  ];
  const versions = ['v1beta', 'v1'];
  
  let results = '';
  for (const v of versions) {
    for (const m of models) {
      console.log(`Testing ${m} on ${v}...`);
      results += await testModel(m, v);
    }
  }
  fs.writeFileSync('model-test-results.txt', results);
  console.log('Results written to model-test-results.txt');
}

runTests();
