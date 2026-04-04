
const mongoose = require('mongoose');
require('dotenv').config();

async function checkMaggi() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const maggi = await db.collection('inventories').findOne({ item_name: /Maggi/i });
        
        if (maggi) {
            console.log('✅ Found Maggi:', JSON.stringify(maggi, null, 2));
        } else {
            console.log('❌ Maggi not found in inventory.');
            
            // Let's add it for testing if it's missing
            const retailer = await db.collection('users').findOne({ role: 'retailer' });
            if (retailer) {
                console.log('Adding Maggi for testing...');
                await db.collection('inventories').insertOne({
                    user_id: retailer._id,
                    item_name: 'Maggi',
                    stock_qty: 100,
                    price_per_unit: 12,
                    cost_per_unit: 10,
                    category: 'Food & Beverages',
                    unit: 'piece'
                });
                console.log('✅ Added Maggi to inventory.');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

checkMaggi();
