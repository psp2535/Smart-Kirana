const mongoose = require('mongoose');
const wholesalerAIService = require('./src/services/wholesalerAIService');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get a wholesaler ID (if any)
        const User = require('./src/models/User');
        const wholesaler = await User.findOne({ role: 'wholesaler' });
        
        if (!wholesaler) {
            console.log('No wholesaler found in DB. Test cannot proceed.');
            process.exit(1);
        }

        console.log('Testing with wholesaler:', wholesaler._id, wholesaler.name);
        const insights = await wholesalerAIService.getWholesalerAIInsights(wholesaler._id);
        
        if (insights.success) {
            console.log('AI Insights Success!');
            console.log('Report Content Snippet:', insights.data.aiAnalysis.substring(0, 500));
            console.log('Profit Summary:', JSON.stringify(insights.data.profitSummary, null, 2));
        } else {
            console.log('AI Insights Failed:', insights.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

test();
