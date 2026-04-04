require('dotenv').config({ path: './.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function verify() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
            }
        });
        
        console.log("Testing gemini-2.5-flash with JSON response...");
        const result = await model.generateContent("Respond with a JSON object saying {'status': 'ok'}");
        const response = await result.response;
        console.log("Response:", response.text());
        console.log("VERIFICATION SUCCESSFUL");
    } catch (e) {
        console.error("VERIFICATION FAILED:", e.message);
    }
}

verify();
