/**
 * Migration Script: Add Locality and GPS Fields
 * Safely adds locality, latitude, longitude, and GeoJSON location fields
 * This is a NON-BREAKING migration - existing records continue to work
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');
const CustomerUser = require('../src/models/CustomerUser');

dotenv.config();

const addLocalityFields = async () => {
    try {
        console.log('🔄 Starting locality and GPS fields migration...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Smart Kirana');
        console.log('✅ Connected to MongoDB');

        // Update Users (Retailers) - Add locality and GPS fields if they don't exist
        const retailersUpdated = await User.updateMany(
            {
                role: 'retailer',
                locality: { $exists: false }
            },
            {
                $set: {
                    locality: null,
                    latitude: null,
                    longitude: null,
                    location: {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                }
            }
        );
        console.log(`✅ Updated ${retailersUpdated.modifiedCount} retailer records with locality and GPS fields`);

        // Update CustomerUsers - Add locality and GPS fields if they don't exist
        const customersUpdated = await CustomerUser.updateMany(
            {
                locality: { $exists: false }
            },
            {
                $set: {
                    locality: null,
                    latitude: null,
                    longitude: null,
                    location: {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                }
            }
        );
        console.log(`✅ Updated ${customersUpdated.modifiedCount} customer records with locality and GPS fields`);

        // Optional: Try to populate locality from existing pincode/city data
        const retailersWithAddress = await User.find({
            role: 'retailer',
            locality: null,
            $or: [
                { 'address.city': { $exists: true, $ne: '' } },
                { 'address.pincode': { $exists: true, $ne: '' } }
            ]
        });

        let autoPopulated = 0;
        for (const retailer of retailersWithAddress) {
            // Use city as default locality if available
            if (retailer.address?.city && !retailer.locality) {
                retailer.locality = retailer.address.city;
                await retailer.save();
                autoPopulated++;
            }
        }
        console.log(`✅ Auto-populated locality for ${autoPopulated} retailers from existing city data`);

        const customersWithAddress = await CustomerUser.find({
            locality: null,
            $or: [
                { 'address.city': { $exists: true, $ne: '' } },
                { 'address.pincode': { $exists: true, $ne: '' } }
            ]
        });

        let customerAutoPopulated = 0;
        for (const customer of customersWithAddress) {
            // Use city as default locality if available
            if (customer.address?.city && !customer.locality) {
                customer.locality = customer.address.city;
                await customer.save();
                customerAutoPopulated++;
            }
        }
        console.log(`✅ Auto-populated locality for ${customerAutoPopulated} customers from existing city data`);

        console.log('\n📊 Migration Summary:');
        console.log(`   Retailers updated: ${retailersUpdated.modifiedCount}`);
        console.log(`   Customers updated: ${customersUpdated.modifiedCount}`);
        console.log(`   Auto-populated retailers: ${autoPopulated}`);
        console.log(`   Auto-populated customers: ${customerAutoPopulated}`);
        console.log('\n✅ Migration completed successfully!');
        console.log('ℹ️  Note: GPS coordinates need to be set by users for distance-based filtering');
        console.log('ℹ️  Records without GPS will use locality/pincode filtering (backward compatible)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

// Run migration
addLocalityFields();
