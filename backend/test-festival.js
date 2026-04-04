const mongoose = require('mongoose');
const festivalForecastService = require('./src/services/festivalForecastService');

async function test() {
  console.log('Festivals Data Length:', festivalForecastService.festivalsData.length);
  
  const now = new Date('2026-04-04');
  console.log('Testing with date:', now.toISOString());
  
  const upcoming = festivalForecastService.findUpcomingFestival(now);
  console.log('Nearest Festival according to logic:', JSON.stringify(upcoming, null, 2));

  // Skip the database call part if we just want to test the logic
  console.log('Checking all distances:');
  for (const f of festivalForecastService.festivalsData) {
    const m = festivalForecastService.getMonthNumber(f.month);
    if (m === now.getMonth()) {
        console.log(`- ${f.festival_name} is in the same month!`);
    }
  }
}

test();
