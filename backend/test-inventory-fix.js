const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const Inventory = require('./src/models/Inventory');

async function testInventoryFix() {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI.replace('localhost', '127.0.0.1');
        await mongoose.connect(mongoUri);
        console.log('Connected.');

        // Test Data
        const testItem = {
            user_id: new mongoose.Types.ObjectId(), // Mock user ID
            item_name: 'Test Beverage ' + Date.now(),
            category: 'Beverages', // This was failing before
            stock_qty: 50,
            unit: 'piece',
            cost_price: 10,
            selling_price: 15,
            price_per_unit: 15
        };

        console.log('Attempting to create inventory item with "Beverages" category...');
        const newItem = await Inventory.create(testItem);
        console.log('SUCCESS: Item created successfully!');
        console.log('Data:', newItem);

        // Cleanup
        await Inventory.findByIdAndDelete(newItem._id);
        console.log('Cleanup: Test item deleted.');

    } catch (error) {
        console.error('FAILED: Validation or processing error:');
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

testInventoryFix();
