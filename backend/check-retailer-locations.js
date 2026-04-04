/**
 * Check Retailer Locations
 * Diagnoses why retailers aren't showing in Browse Stores
 * Run: node check-retailer-locations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function checkRetailerLocations() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Smart Kirana');
    console.log('✅ Connected to MongoDB\n');

    // Get all retailers
    const allRetailers = await User.find({ role: 'retailer' });
    console.log(`📊 Total Retailers: ${allRetailers.length}\n`);

    // Check retailers with lat/lng
    const withLatLng = allRetailers.filter(r => r.latitude && r.longitude);
    console.log(`📍 Retailers with Latitude/Longitude: ${withLatLng.length}`);

    // Check retailers with proper GeoJSON location
    const withGeoJSON = allRetailers.filter(r => 
      r.location && 
      r.location.type === 'Point' && 
      r.location.coordinates && 
      r.location.coordinates.length === 2
    );
    console.log(`🗺️  Retailers with GeoJSON Location: ${withGeoJSON.length}`);

    // Check retailers with CORRECT GeoJSON (matching lat/lng)
    const withCorrectGeoJSON = allRetailers.filter(r => {
      if (!r.latitude || !r.longitude) return false;
      if (!r.location || !r.location.coordinates) return false;
      return (
        r.location.coordinates[0] === r.longitude &&
        r.location.coordinates[1] === r.latitude
      );
    });
    console.log(`✅ Retailers with CORRECT GeoJSON: ${withCorrectGeoJSON.length}\n`);

    // Show retailers that need fixing
    const needsFix = allRetailers.filter(r => {
      if (!r.latitude || !r.longitude) return false;
      if (!r.location || !r.location.coordinates) return true;
      return !(
        r.location.coordinates[0] === r.longitude &&
        r.location.coordinates[1] === r.latitude
      );
    });

    if (needsFix.length > 0) {
      console.log(`⚠️  ${needsFix.length} Retailers Need Location Fix:\n`);
      needsFix.forEach((r, i) => {
        console.log(`${i + 1}. ${r.shop_name || r.name}`);
        console.log(`   Lat/Lng: [${r.longitude}, ${r.latitude}]`);
        console.log(`   GeoJSON: ${r.location ? JSON.stringify(r.location.coordinates) : 'Missing'}`);
        console.log('');
      });

      console.log('💡 To fix, run: node backend/migrate-location-geojson.js\n');
    } else {
      console.log('✅ All retailers with lat/lng have correct GeoJSON!\n');
    }

    // Test geospatial query
    if (withCorrectGeoJSON.length > 0) {
      console.log('🧪 Testing Geospatial Query...');
      const testRetailer = withCorrectGeoJSON[0];
      console.log(`Using ${testRetailer.shop_name || testRetailer.name} as test point`);
      console.log(`Location: [${testRetailer.longitude}, ${testRetailer.latitude}]\n`);

      try {
        const nearby = await User.find({
          role: 'retailer',
          latitude: { $exists: true, $ne: null },
          longitude: { $exists: true, $ne: null },
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [testRetailer.longitude, testRetailer.latitude]
              },
              $maxDistance: 10000 // 10km
            }
          }
        }).limit(10);

        console.log(`✅ Geospatial query works! Found ${nearby.length} retailers within 10km:`);
        nearby.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.shop_name || r.name}`);
        });
      } catch (error) {
        console.error('❌ Geospatial query failed:', error.message);
        if (error.message.includes('2dsphere')) {
          console.log('\n💡 Creating 2dsphere index...');
          await User.collection.createIndex({ location: '2dsphere' });
          console.log('✅ Index created! Try running this script again.');
        }
      }
    } else {
      console.log('⚠️  No retailers with correct GeoJSON to test query');
    }

    await mongoose.connection.close();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRetailerLocations();
