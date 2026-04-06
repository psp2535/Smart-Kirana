#!/usr/bin/env node

/**
 * Pre-deployment checker for Smart Kirana
 * Verifies all necessary files and configurations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Smart Kirana Deployment Checker\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function check(name, condition, type = 'error') {
  if (condition) {
    console.log(`✅ ${name}`);
    checks.passed++;
  } else {
    if (type === 'warning') {
      console.log(`⚠️  ${name}`);
      checks.warnings++;
    } else {
      console.log(`❌ ${name}`);
      checks.failed++;
    }
  }
}

// Check backend files
console.log('📦 Backend Checks:');
check('backend/package.json exists', fs.existsSync('backend/package.json'));
check('backend/src/server.js exists', fs.existsSync('backend/src/server.js'));
check('backend/.env.example exists', fs.existsSync('backend/.env.example'));

// Check frontend files
console.log('\n🎨 Frontend Checks:');
check('frontend/package.json exists', fs.existsSync('frontend/package.json'));
check('frontend/src/App.jsx exists', fs.existsSync('frontend/src/App.jsx'));
check('frontend/public/index.html exists', fs.existsSync('frontend/public/index.html'));

// Check deployment files
console.log('\n🚀 Deployment Files:');
check('render.yaml exists', fs.existsSync('render.yaml'));
check('vercel.json exists', fs.existsSync('vercel.json'));
check('DEPLOYMENT.md exists', fs.existsSync('DEPLOYMENT.md'));

// Check package.json scripts
console.log('\n📜 Package Scripts:');
try {
  const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  check('backend has start script', !!backendPkg.scripts?.start);
  check('backend has dev script', !!backendPkg.scripts?.dev, 'warning');
  
  const frontendPkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  check('frontend has build script', !!frontendPkg.scripts?.build);
  check('frontend has start script', !!frontendPkg.scripts?.start);
} catch (e) {
  console.log('❌ Error reading package.json files');
  checks.failed++;
}

// Check for sensitive files
console.log('\n🔒 Security Checks:');
const gitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
check('.env files ignored', gitignore.includes('.env'));
check('node_modules ignored', gitignore.includes('node_modules'));

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Summary:');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log(`❌ Failed: ${checks.failed}`);

if (checks.failed === 0) {
  console.log('\n🎉 Ready for deployment!');
  console.log('\n📖 Next steps:');
  console.log('1. Read DEPLOYMENT.md for detailed instructions');
  console.log('2. Set up MongoDB Atlas database');
  console.log('3. Deploy backend to Render');
  console.log('4. Deploy frontend to Vercel');
  process.exit(0);
} else {
  console.log('\n⚠️  Please fix the failed checks before deploying');
  process.exit(1);
}
