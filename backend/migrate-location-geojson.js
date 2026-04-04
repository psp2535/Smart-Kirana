/**
 * Migration Script: Fix GeoJSON Location for Existing Retailers
 * Updates all retailers that have latitude/longitude but missing GeoJSON location
 * Run: node migrate-location-geojson.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function migrateLocationData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Smart Kirana');
    console.log('✅ Connected to MongoDB\n');

    // Find all retailers with lat/lng but no proper GeoJSON location
    const retailers = await User.find({
      role: 'retailer',
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${retailers.length} retailers with location data\n`);

    if (retailers.length === 0) {
      console.log('✅ No retailers need migration');
      await mongoose.connection.close();
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const retailer of retailers) {
      try {
        // Check if GeoJSON location is already correct
        const hasCorrectLocation = 
          retailer.location &&
          retailer.location.type === 'Point' &&
          retailer.location.coordinates &&
          retailer.location.coordinates[0] === retailer.longitude &&
          retailer.location.coordinates[1] === retailer.latitude;

        if (hasCorrectLocation) {
          console.log(`⏭️  Skipped: ${retailer.shop_name || retailer.name} (already correct)`);
          skipped++;
          continue;
        }

        // Update GeoJSON location
        retailer.location = {
          type: 'Point',
          coordinates: [retailer.longitude, retailer.latitude]
        };

        await retailer.save();

        console.log(`✅ Updated: ${retailer.shop_name || retailer.name}`);
        console.log(`   Location: [${retailer.longitude}, ${retailer.latitude}]`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${retailer.shop_name || retailer.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total retailers: ${retailers.length}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Verify 2dsphere index exists
    console.log('\n🔍 Checking indexes...');
    const indexes = await User.collection.getIndexes();
    const hasGeoIndex = Object.keys(indexes).some(key => 
      indexes[key].key && indexes[key].key.location === '2dsphere'
    );

    if (hasGeoIndex) {
      console.log('✅ 2dsphere index exists on location field');
    } else {
      console.log('⚠️  2dsphere index missing! Creating...');
      await User.collection.createIndex({ location: '2dsphere' });
      console.log('✅ 2dsphere index created');
    }

    // Test geospatial query
    if (updated > 0 || skipped > 0) {
      console.log('\n🧪 Testing geospatial query...');
      const testRetailer = retailers[0];
      const nearby = await User.find({
        role: 'retailer',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [testRetailer.longitude, testRetailer.latitude]
            },
            $maxDistance: 10000 // 10km
          }
        }
      }).limit(5);

      console.log(`✅ Found ${nearby.length} retailers within 10km of test location`);
      nearby.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.shop_name || r.name}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateLocationData();
