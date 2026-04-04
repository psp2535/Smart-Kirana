
const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TOKEN = process.env.TEST_USER_TOKEN; // Ensure you have a valid token in .env

async function testChatbot() {
    console.log('🚀 Starting Chatbot Logic Verification...');

    if (!TOKEN) {
        console.error('❌ Error: TEST_USER_TOKEN not found in .env');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    };

    // Test 1: Customer Dish Request
    try {
        console.log('\n📝 Test 1: Customer Dish Request ("Chicken Curry")');
        const res1 = await axios.post(`${API_URL}/chatbot/chat`, {
            message: "I want to cook chicken curry for 4 people",
            language: "en",
            retailer_id: "65f0a1b2c3d4e5f6g7h8i9j0" // Use a dummy or real ID
        }, { headers });
        
        console.log('📥 Response:', res1.data.message);
        if (res1.data.data && res1.data.data.availableItems) {
            console.log('✅ Success: Extracted items correctly.');
        } else {
            console.warn('⚠️ Warning: No items extracted.');
        }
    } catch (err) {
        console.error('❌ Test 1 Failed:', err.response?.data || err.message);
    }

    // Test 2: Retailer Profit Query
    try {
        console.log('\n📊 Test 2: Retailer Profit Query ("What is my profit today?")');
        const res2 = await axios.post(`${API_URL}/chatbot/chat`, {
            message: "What is my profit today?",
            language: "en"
        }, { headers });
        
        console.log('📥 Response:', res2.data.message);
        if (res2.data.message.includes('₹') && (res2.data.message.includes('profit') || res2.data.message.includes('Revenue'))) {
            console.log('✅ Success: Financial metrics present.');
        } else {
            console.warn('⚠️ Warning: Financial metrics might be missing.');
        }
    } catch (err) {
        console.error('❌ Test 2 Failed:', err.response?.data || err.message);
    }

    // Test 3: Multilingual Support (Hindi)
    try {
        console.log('\n🇮🇳 Test 3: Multilingual Support ("आज का लाभ क्या है?")');
        const res3 = await axios.post(`${API_URL}/chatbot/chat`, {
            message: "आज का लाभ क्या है?",
            language: "hi"
        }, { headers });
        
        console.log('📥 Response:', res3.data.message);
        // Simple check for Hindi characters or specific keywords
        if (/[\u0900-\u097F]/.test(res3.data.message)) {
            console.log('✅ Success: Response is in Hindi.');
        } else {
            console.warn('⚠️ Warning: Response might not be in Hindi.');
        }
    } catch (err) {
        console.error('❌ Test 3 Failed:', err.response?.data || err.message);
    }

    console.log('\n🏁 Verification Complete.');
}

testChatbot();
