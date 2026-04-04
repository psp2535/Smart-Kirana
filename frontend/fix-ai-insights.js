const fs = require('fs');
const path = require('path');

const filePaths = [
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/pages/WholesalerAIInsights.jsx',
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/pages/WholesalerDashboard.jsx'
];

filePaths.forEach(filePath => {
    if(!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    const hues = ['blue', 'green', 'purple', 'red', 'yellow', 'orange', 'indigo'];

    hues.forEach(hue => {
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
        
        // borders
        content = content.replace(new RegExp(`\\bborder-${hue}-200\\b`, 'g'), 'border-neutral-200 dark:border-neutral-700');
        content = content.replace(new RegExp(`\\bborder-${hue}-500\\b`, 'g'), 'border-black dark:border-white');
    });

    content = content.replace(/#3b82f6|#10b981|#8b5cf6|#f59e0b|#ef4444|#ec4899|#4F46E5/gi, '#171717');
    content = content.replace(/fill="#[0-9a-fA-F]{6}"/g, (match) => {
        if (match.includes('#fff') || match.includes('#ffffff') || match.includes('#171717')) return match;
        return 'fill="#171717"';
    });
    content = content.replace(/stroke="#[0-9a-fA-F]{6}"/g, (match) => {
        if (match.includes('#fff') || match.includes('#ffffff') || match.includes('#f0f0f0') || match.includes('#6b7280') || match.includes('#e5e7eb') || match.includes('#171717')) return match;
        return 'stroke="#171717"';
    });

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed Wholesaler components too');
