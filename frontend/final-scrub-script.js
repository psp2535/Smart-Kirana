const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/91703/OneDrive/Desktop/smartkirana/Smart-Kirana/frontend/src';
const componentsDir = path.join(baseDir, 'components');
const pagesDir = path.join(baseDir, 'pages');

const specificFiles = [
    path.join(componentsDir, 'FloatingAIChatbot.jsx'),
    path.join(componentsDir, 'FloatingChatbot.jsx'),
    path.join(componentsDir, 'CustomerChatbot.jsx'),
    path.join(componentsDir, 'Chatbot.jsx'),
    path.join(componentsDir, 'StoreSelector.jsx'),
    path.join(componentsDir, 'OrderSummary.jsx'),
    path.join(pagesDir, 'CustomerChatbotPage.jsx'),
    path.join(pagesDir, 'CustomerChatbotPageNew.jsx')
];

const hues = ['blue', 'indigo', 'purple', 'pink', 'sky', 'teal', 'green', 'red', 'yellow', 'orange', 'primary'];

function scrubFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Specific complex gradients and shadow colors
    content = content.replace(/bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600/g, 'bg-black dark:bg-white text-white dark:text-black');
    content = content.replace(/bg-gradient-to-r from-purple-600 to-blue-600/g, 'bg-black dark:bg-white text-white dark:text-black');
    content = content.replace(/bg-gradient-to-br from-blue-500 to-purple-600/g, 'bg-black dark:bg-white text-white dark:text-black');
    content = content.replace(/bg-gradient-to-r from-blue-600 to-purple-600/g, 'bg-black dark:bg-white text-white dark:text-black');
    content = content.replace(/bg-gradient-to-r from-blue-500 to-purple-600/g, 'bg-black dark:bg-white text-white dark:text-black');
    content = content.replace(/bg-gradient-to-br from-neutral-50 to-pink-50/g, 'bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800');
    
    // Pulse animation keyframes specifically
    content = content.replace(/rgba\(147, 51, 234, 0.7\)/g, 'rgba(0, 0, 0, 0.5)');
    content = content.replace(/rgba\(147, 51, 234, 0\)/g, 'rgba(0, 0, 0, 0)');
    
    // shadow-purple-500/50
    content = content.replace(/shadow-purple-500\/50/g, 'shadow-neutral-500/50');
    
    // 2. Systematic Tailwind color replacement
    hues.forEach(hue => {
        // text colors
        content = content.replace(new RegExp(`\\btext-${hue}-[456789]00\\b`, 'g'), 'text-black dark:text-white');
        content = content.replace(new RegExp(`\\btext-${hue}-\\d+\\b`, 'g'), 'text-black dark:text-white');
        
        // background colors
        content = content.replace(new RegExp(`\\bbg-${hue}-[4567]00\\b`, 'g'), 'bg-black dark:bg-white');
        content = content.replace(new RegExp(`\\bbg-${hue}-(?:50|100|200)\\b`, 'g'), 'bg-neutral-100 dark:bg-neutral-800');
        content = content.replace(new RegExp(`\\bbg-${hue}-\\d+\\b`, 'g'), 'bg-black dark:bg-white');
        
        // border colors
        content = content.replace(new RegExp(`\\bborder-${hue}-\\d+\\b`, 'g'), 'border-neutral-200 dark:border-neutral-700');
        
        // hover/focus states
        content = content.replace(new RegExp(`\\bhover:bg-${hue}-\\d+\\b`, 'g'), 'hover:bg-neutral-800 dark:hover:bg-neutral-200');
        content = content.replace(new RegExp(`\\bhover:text-${hue}-\\d+\\b`, 'g'), 'hover:text-black dark:hover:text-white');
        content = content.replace(new RegExp(`\\bfocus:ring-${hue}-\\d+\\b`, 'g'), 'focus:ring-black dark:focus:ring-white');
        content = content.replace(new RegExp(`\\bhover:border-${hue}-\\d+\\b`, 'g'), 'hover:border-black dark:hover:border-white');
        
        // gradients (from, to, via)
        content = content.replace(new RegExp(`\\bfrom-${hue}-\\d+\\b`, 'g'), 'from-neutral-100 dark:from-neutral-800');
        content = content.replace(new RegExp(`\\bto-${hue}-\\d+\\b`, 'g'), 'to-neutral-100 dark:to-neutral-800');
        content = content.replace(new RegExp(`\\bvia-${hue}-\\d+\\b`, 'g'), 'via-neutral-100 dark:via-neutral-800');
    });
    
    // 3. Final polish for specific UI cases
    // text colors on black bg should be white
    content = content.replace(/bg-black(?!\s+dark:bg-white)\s+text-black/g, 'bg-black text-white');
    // shadow-2xl etc.
    content = content.replace(/\btext-blue-100\b/g, 'text-neutral-300');
    content = content.replace(/\bborder-blue-600\b/g, 'border-black dark:border-white');
    content = content.replace(/\bdark:text-blue-100\b/g, 'dark:text-neutral-300');

    fs.writeFileSync(filePath, content, 'utf8');
}

specificFiles.forEach(scrubFile);

console.log('Final monochrome assistant scrub completed.');
