const fs = require('fs');
const path = require('path');

const directories = [
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/pages',
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/components'
];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) return;
        if (!file.endsWith('.jsx')) return;
        
        let content = fs.readFileSync(filePath, 'utf8');

        // Target primary exactly
        content = content.replace(/\btext-primary-[456]00\b/g, 'text-black dark:text-white');
        content = content.replace(/\btext-primary-900\b/g, 'text-black dark:text-white');
        content = content.replace(/\btext-primary-800\b/g, 'text-neutral-800 dark:text-neutral-200');
        content = content.replace(/\btext-primary-700\b/g, 'text-black dark:text-white');
        content = content.replace(/\bbg-primary-[456]00\b/g, 'bg-black dark:bg-white');
        content = content.replace(/\bbg-primary-50\b/g, 'bg-neutral-100 dark:bg-neutral-800');
        content = content.replace(/\bbg-primary-100\b/g, 'bg-neutral-200 dark:bg-neutral-700');
        content = content.replace(/\bborder-primary-500\b/g, 'border-black dark:border-white');
        content = content.replace(/\bborder-primary-600\b/g, 'border-black dark:border-white');
        content = content.replace(/\bborder-primary-200\b/g, 'border-neutral-200 dark:border-neutral-700');
        content = content.replace(/\bring-primary-500\b/g, 'ring-black dark:ring-white');
        content = content.replace(/\bhover:bg-primary-[67]00\b/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
        
        // ensure inner text is distinct
        content = content.replace(/bg-black dark:bg-white\s+text-white\b/g, 'bg-black dark:bg-white text-white dark:text-black');

        fs.writeFileSync(filePath, content, 'utf8');
    });
}

directories.forEach(processDirectory);
console.log('Processed primary colors across all components');
