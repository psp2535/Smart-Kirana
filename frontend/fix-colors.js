const fs = require('fs');
const path = require('path');

const pagesDir = path.join('c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/pages');

// Files to process
const files = [
  'Sales.jsx', 'Expenses.jsx', 'Inventory.jsx', 'CustomersHub.jsx', 
  'DiscountCampaigns.jsx', 'WholesalersHub.jsx', 'AIInsights.jsx', 'Analytics.jsx',
  'RetailerWholesalerOrders.jsx', 'WholesalerAIInsights.jsx', 'WholesalerDashboard.jsx',
  'WholesalerInventory.jsx', 'WholesalerOrders.jsx'
];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Primary Buttons & Backgrounds
  content = content.replace(/\bbg-indigo-600\b/g, 'bg-black dark:bg-white');
  content = content.replace(/\bbg-purple-600\b/g, 'bg-black dark:bg-white');
  content = content.replace(/\bbg-blue-600\b/g, 'bg-black dark:bg-white');
  
  content = content.replace(/\bhover:bg-indigo-[789]00\b/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
  content = content.replace(/\bhover:bg-purple-[789]00\b/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
  content = content.replace(/\bhover:bg-blue-[789]00\b/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');

  content = content.replace(/\bbg-black dark:bg-white\s+text-white\b/g, 'bg-black dark:bg-white text-white dark:text-black');
  
  // Custom button gradient handling
  content = content.replace(/\bbg-gradient-to-r from-[a-z]+-\d+ to-[a-z]+-\d+\b/g, 'bg-black dark:bg-white text-white dark:text-black');
  content = content.replace(/\bbg-gradient-to-br from-[a-z]+-\d+ to-[a-z]+-\d+\b/g, 'bg-black dark:bg-white text-white dark:text-black');
  content = content.replace(/\bhover:from-[a-z]+-\d+\b/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
  content = content.replace(/\bhover:to-[a-z]+-\d+\b/g, '');

  // Accents Texts
  content = content.replace(/\btext-indigo-[5678]00\b/g, 'text-black dark:text-white');
  content = content.replace(/\btext-purple-[5678]00\b/g, 'text-black dark:text-white');
  content = content.replace(/\btext-blue-[5678]00\b/g, 'text-black dark:text-white');

  // Borders
  content = content.replace(/\bborder-indigo-[56]00\b/g, 'border-black dark:border-white');
  content = content.replace(/\bborder-purple-[56]00\b/g, 'border-black dark:border-white');
  content = content.replace(/\bborder-blue-[56]00\b/g, 'border-black dark:border-white');
  
  content = content.replace(/\bborder-indigo-[1238]00\b/g, 'border-neutral-200 dark:border-neutral-700');
  content = content.replace(/\bborder-purple-[1238]00\b/g, 'border-neutral-200 dark:border-neutral-700');
  content = content.replace(/\bborder-blue-[1238]00\b/g, 'border-neutral-200 dark:border-neutral-700');
  
  content = content.replace(/\bfocus:ring-indigo-\d+\b/g, 'focus:ring-black dark:focus:ring-white');
  content = content.replace(/\bfocus:border-indigo-\d+\b/g, 'focus:border-black dark:focus:border-white');

  // Subtle Backgrounds
  content = content.replace(/\bbg-indigo-50\b/g, 'bg-neutral-100 dark:bg-neutral-800');
  content = content.replace(/\bbg-purple-50\b/g, 'bg-neutral-100 dark:bg-neutral-800');
  content = content.replace(/\bbg-blue-50\b/g, 'bg-neutral-100 dark:bg-neutral-800');
  content = content.replace(/\bbg-indigo-100\b/g, 'bg-neutral-200 dark:bg-neutral-700');
  content = content.replace(/\bbg-purple-100\b/g, 'bg-neutral-200 dark:bg-neutral-700');
  content = content.replace(/\bbg-blue-100\b/g, 'bg-neutral-200 dark:bg-neutral-700');

  // Gradients backgrounds
  content = content.replace(/\bbg-gradient-to-r from-[a-z]+-50 to-[a-z]+-50\b/g, 'bg-neutral-50 dark:bg-neutral-800');
  content = content.replace(/\bbg-gradient-to-br from-[a-z]+-50 to-[a-z]+-50\b/g, 'bg-neutral-50 dark:bg-neutral-800');
  
  content = content.replace(/\bdark:from-[a-z]+-900\/20\b/g, '');
  content = content.replace(/\bdark:to-[a-z]+-900\/20\b/g, '');

  content = content.replace(/\bdark:bg-indigo-[0-9]+\/[0-9]+\b/g, 'dark:bg-neutral-800');
  content = content.replace(/\bdark:text-indigo-[0-9]+\b/g, 'dark:text-white');

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log("Colors updated safely.");
