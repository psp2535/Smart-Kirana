const fs = require('fs');
const path = require('path');

const filePaths = [
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/components/Chatbot.jsx',
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/components/CustomerChatbot.jsx',
    'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src/components/FloatingChatbot.jsx'
];

filePaths.forEach(filePath => {
    if(!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove specific gradients
    content = content.replace(/bg-gradient-to-r from-blue-600 to-blue-700/g, 'bg-black dark:bg-white text-white dark:text-black');
    content = content.replace(/bg-gradient-to-br from-neutral-50 to-neutral-100/g, 'bg-neutral-50 dark:bg-neutral-900');
    content = content.replace(/bg-gradient-to-br from-neutral-50 to-pink-50/g, 'bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800');
    content = content.replace(/bg-gradient-to-br from-neutral-50 to-neutral-100/g, 'bg-neutral-50 dark:bg-neutral-900');

    // Replace hardcoded hovers
    content = content.replace(/hover:bg-blue-700/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
    content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
    content = content.replace(/hover:bg-purple-700/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
    content = content.replace(/hover:bg-green-700/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
    content = content.replace(/hover:bg-red-700/g, 'hover:bg-neutral-800 dark:hover:bg-neutral-200');

    // Specific colors
    content = content.replace(/bg-pink-500/g, 'bg-black dark:bg-white');
    content = content.replace(/text-indigo-900/g, 'text-black dark:text-white');
    
    // Catch-all for common tailwind colors again just in case
    const hues = ['blue', 'indigo', 'green', 'purple', 'red', 'yellow', 'orange', 'pink', 'primary'];
    hues.forEach(hue => {
        const regexText = new RegExp(`\\btext-${hue}-\\d+\\b`, 'g');
        content = content.replace(regexText, 'text-black dark:text-white');
        
        const regexBg = new RegExp(`\\bbg-${hue}-\\d+\\b`, 'g');
        content = content.replace(regexBg, (match) => {
            if (match.endsWith('-50') || match.endsWith('-100')) return 'bg-neutral-100 dark:bg-neutral-800';
            return 'bg-black dark:bg-white';
        });
        
        const regexBorder = new RegExp(`\\bborder-${hue}-\\d+\\b`, 'g');
        content = content.replace(regexBorder, 'border-neutral-200 dark:border-neutral-700');
    });

    // Final cleanup of text colors on dark backgrounds
    content = content.replace(/bg-black text-white/g, 'bg-black dark:bg-white text-white dark:text-black');

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Chatbots are now strictly monochrome.');
