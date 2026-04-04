const fs = require('fs');
const path = require('path');

const filePaths = [
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/pages/WholesalerDiscovery.jsx',
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/pages/WholesalerOffers.jsx'
];

filePaths.forEach(filePath => {
    if(!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');

    const hues = ['blue', 'green', 'purple', 'red', 'yellow', 'orange', 'indigo', 'primary'];

    hues.forEach(hue => {
        // Handle primary explicitely for text and backgrounds
        if (hue === 'primary') {
            content = content.replace(/\btext-primary-[456]00\b/g, 'text-black dark:text-white');
            content = content.replace(/\btext-primary-900\b/g, 'text-black dark:text-white');
            content = content.replace(/\btext-primary-800\b/g, 'text-neutral-800 dark:text-neutral-200');
            content = content.replace(/\btext-primary-700\b/g, 'text-black dark:text-white');
            content = content.replace(/\bbg-primary-[456]00\b/g, 'bg-black dark:bg-white');
            content = content.replace(/\bbg-primary-50\b/g, 'bg-neutral-100 dark:bg-neutral-800');
            content = content.replace(/\bbg-primary-100\b/g, 'bg-neutral-200 dark:bg-neutral-700');
            content = content.replace(/\bborder-primary-500\b/g, 'border-black dark:border-white');
            content = content.replace(/\bring-primary-500\b/g, 'ring-black dark:ring-white');
            content = content.replace(/\bhover:bg-primary-[67]00\b/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
            return;
        }

        // text colors
        content = content.replace(new RegExp(`\\btext-${hue}-[456]00\\b`, 'g'), 'text-black dark:text-white');
        content = content.replace(new RegExp(`\\btext-${hue}-900\\b`, 'g'), 'text-black dark:text-white');
        content = content.replace(new RegExp(`\\btext-${hue}-800\\b`, 'g'), 'text-neutral-800 dark:text-neutral-200');
        content = content.replace(new RegExp(`\\btext-${hue}-700\\b`, 'g'), 'text-black dark:text-white');
        content = content.replace(new RegExp(`\\btext-${hue}-50\\b`, 'g'), 'text-white dark:text-black');
        
        // backgrounds
        content = content.replace(new RegExp(`\\bbg-${hue}-50\\b`, 'g'), 'bg-neutral-100 dark:bg-neutral-800');
        content = content.replace(new RegExp(`\\bbg-${hue}-100\\b`, 'g'), 'bg-neutral-200 dark:bg-neutral-700');
        content = content.replace(new RegExp(`\\bbg-${hue}-200\\b`, 'g'), 'bg-neutral-300 dark:bg-neutral-600');
        content = content.replace(new RegExp(`\\bbg-${hue}-[456]00\\b`, 'g'), 'bg-black dark:bg-white');
        content = content.replace(new RegExp(`\\bbg-${hue}-800\\b`, 'g'), 'bg-neutral-800 dark:bg-neutral-200');
        content = content.replace(new RegExp(`\\bbg-${hue}-900\\b`, 'g'), 'bg-neutral-900 dark:bg-neutral-100');
        
        // gradient removals
        content = content.replace(new RegExp(`\\bfrom-${hue}-50\\b`, 'g'), 'from-neutral-50');
        content = content.replace(new RegExp(`\\bto-${hue}-50\\b`, 'g'), 'to-neutral-100');
        
        // borders
        content = content.replace(new RegExp(`\\bborder-${hue}-200\\b`, 'g'), 'border-neutral-200 dark:border-neutral-700');
        content = content.replace(new RegExp(`\\bborder-${hue}-500\\b`, 'g'), 'border-black dark:border-white');
    });

    content = content.replace(/bg-black dark:bg-white\s+text-white\b/g, 'bg-black dark:bg-white text-white dark:text-black');

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed WholesalerDiscovery and WholesalerOffers');
