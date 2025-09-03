require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x87bAa1694381aE3eCaE2660d97fe60404080Eb64';
const LINEA_RPC_URL = process.env.CUSTOM_RPC_URL || process.env.LINEA_RPC_URL || 'https://rpc.linea.build';

// Contract ABI for calculateAllocation function
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "calculateAllocation",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider(LINEA_RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// Helper function to validate Ethereum address
function isValidAddress(address) {
    try {
        // Check if it's a valid hex string with proper length
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        // Remove whitespace and convert to lowercase
        const cleanAddress = address.trim();
        
        // Check format: 0x + 40 hex characters
        if (!cleanAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return false;
        }
        
        // Use ethers validation
        ethers.getAddress(cleanAddress);
        return true;
    } catch (error) {
        return false;
    }
}

// Helper function to extract addresses from text
function extractAddresses(text) {
    // Find all potential addresses in the text
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const matches = text.match(addressPattern) || [];
    
    // Validate and deduplicate addresses
    const validAddresses = [];
    const seen = new Set();
    
    for (const match of matches) {
        const cleanAddress = match.trim().toLowerCase();
        if (isValidAddress(match) && !seen.has(cleanAddress)) {
            validAddresses.push(match);
            seen.add(cleanAddress);
        }
    }
    
    return validAddresses;
}

// Generate Lineascan URL for address
function getLineascanUrl(address) {
    return `https://lineascan.build/address/${address}`;
}

// Random phrases for bot personality
const phrases = {
    checking: [
        '🔍 Digging through the blockchain, hunting for your tokens...',
        '⚡ Casting Linea contract magic spells...',
        '🎯 Targeting your allocation with precision...',
        '🚀 Launching intergalactic scanner...',
        '💎 Searching for your precious tokens...',
        '🔮 Reading the contract crystal ball...',
        '⚡ Hacking the blockchain to find the truth...'
    ],
    success: [
        '🎉 Bingo! Found your tokens!',
        '💰 Treasure found! Here\'s your loot:',
        '🚀 Let\'s go! Your allocation is ready:',
        '💎 Jackpot! Check what you\'ve got:',
        '🎯 Bulls-eye! Here\'s your result:',
        '⚡ Lightning struck! Your allocation:',
        '🔥 Fire! Here\'s what you earned:'
    ],
    noAllocation: [
        '😢 Sadly, the contract says you have 0 tokens...',
        '💔 Bad news - allocation is empty',
        '🤷‍♂️ Contract is silent, seems like nothing there',
        '😔 Empty... but don\'t give up!',
        '🚫 Zero allocation, but you\'re still awesome!'
    ],
    batchStart: [
        '🚀 Launching mass check! Prepare for data fireworks!',
        '⚡ Checking a whole army of wallets! This will be epic!',
        '🎯 Scanning your list like Terminator!',
        '💎 Mass treasure hunt begins!',
        '🔥 Batch mode activated! Hold tight!'
    ],
    errors: [
        '🤖 Oops! Something went wrong in the matrix...',
        '💥 Houston, we have problems!',
        '🔧 Robot broke down, but I\'m fixing it...',
        '⚠️ System glitch! Try again',
        '🆘 SOS! Need blockchain tech support!'
    ]
};

function getRandomPhrase(category) {
    const categoryPhrases = phrases[category] || ['🤖 Something is happening...'];
    return categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];
}

// Helper function to format allocation amount
function formatAllocation(rawAllocation) {
    try {
        // Convert to BigInt for precise calculations
        const allocation = BigInt(rawAllocation.toString());
        
        // Divide by 10^18 (1 ether = 10^18 wei) to get the final allocation
        const divisor = BigInt('1000000000000000000'); // 10^18
        const finalAllocation = allocation / divisor;
        
        // Return only the integer part (floor) to match official checker
        return finalAllocation.toString();
    } catch (error) {
        console.error('Error formatting allocation:', error);
        return '0';
    }
}

// Main function to check allocation
async function checkAllocation(address) {
    try {
        console.log(`Checking allocation for address: ${address}`);
        
        // Call the calculateAllocation function
        const rawAllocation = await contract.calculateAllocation(address);
        
        console.log(`Raw allocation result: ${rawAllocation.toString()}`);
        
        // Format the allocation
        const formattedAllocation = formatAllocation(rawAllocation);
        
        return {
            success: true,
            allocation: formattedAllocation,
            rawValue: rawAllocation.toString()
        };
    } catch (error) {
        console.error('Error checking allocation:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Batch check multiple addresses
async function checkBatchAllocations(addresses) {
    const results = [];
    let totalFound = 0;
    let totalAllocation = BigInt(0);
    
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const result = await checkAllocation(address);
        
        if (result.success && result.allocation !== '0') {
            totalFound++;
            totalAllocation += BigInt(result.allocation);
        }
        
        results.push({
            address,
            ...result
        });
        
        // Small delay to avoid rate limiting
        if (i < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return {
        results,
        summary: {
            total: addresses.length,
            found: totalFound,
            totalAllocation: totalAllocation.toString()
        }
    };
}

// Bot command handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🤖 **Hello! I'm Linea Hunter Bot!** 🔥

 YYS I'm not just a bot, I'm an airdrop hunter! My mission is to find all your treasures in the Linea blockchain!

**🚀 What I can do:**
• 💎 Check allocation for one wallet
• ⚡ Check up to 50 wallets at once (insane power!)
• 🔗 Provide direct Lineascan links
• 🔮 Understand any list format

**🎯 How to use:**
📱 Single wallet: just send the address
📃 Multiple wallets: send a list (any format)

**⚡ Examples:**
\`0x1234...abcd\` - single wallet

\`\`\`
0x1234...abcd
0x5678...efgh  
0x9abc...1234
\`\`\`
Or just paste your list - I'll find all addresses myself! 🤖

**Commands:**
/help - Help
/check <address> - Check specific address

🔥 **Let's hunt for your tokens!** 🔥
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📖 **Help - Linea Hunter Bot** 🤖

**🔍 How it works:**
• I call the calculateAllocation function of the Linea contract
• Contract: \`${CONTRACT_ADDRESS}\`
• Network: Linea Mainnet
• Result is processed (divided by 10^18) to show your allocation
• I provide Lineascan link for each wallet

**💰 Usage:**
• Send any Ethereum address to check
• Or use \`/check <address>\` command
• Address format: 0x + 40 hex characters
• Can check up to 50 addresses at once!

**⚡ Examples:**
\`/check 0x1234567890123456789012345678901234567890\`
\`0x1234567890123456789012345678901234567890\`

**🔥 Batch checking:**
\`\`\`
0x1111...
0x2222...
0x3333...
\`\`\`

Need help? Contact the developer! 🛠️
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Handle /check command
bot.onText(/\/check (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const address = match[1].trim();
    
    await handleAllocationCheck(chatId, address);
});

// Handle direct address input
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Skip if it's a command
    if (text.startsWith('/')) {
        return;
    }
    
    // Extract addresses from the message
    const addresses = extractAddresses(text);
    
    if (addresses.length === 1) {
        // Single address
        await handleAllocationCheck(chatId, addresses[0]);
    } else if (addresses.length > 1) {
        // Multiple addresses - batch check
        if (addresses.length > 50) {
            bot.sendMessage(chatId, `
⚠️ **Too many addresses!**

Maximum 50 addresses at once. You have ${addresses.length}.
Split your list into parts or send the first 50.

🔥 I'm ready to process your wallet army, but in batches!
            `, { parse_mode: 'Markdown' });
            return;
        }
        
        await handleBatchCheck(chatId, addresses);
    } else if (text.length > 10) {
        // No valid addresses found but text is long enough
        bot.sendMessage(chatId, `
❌ **No valid addresses found!**

Make sure addresses are in format: 0x + 40 hex characters

**Examples of valid addresses:**
\`0x1234567890123456789012345678901234567890\`
\`0xabcdefabcdefabcdefabcdefabcdefabcdefabcd\`

🤖 I'm smart, but not smart enough to guess what you meant!
        `, { parse_mode: 'Markdown' });
    }
});

// Main allocation check handler (single address)
async function handleAllocationCheck(chatId, address) {
    // Validate address format
    if (!isValidAddress(address)) {
        bot.sendMessage(chatId, `
❌ **Invalid address!**

Address must be in format: 0x + 40 hex characters

**Example:** \`0x1234567890123456789012345678901234567890\`

🤖 Check carefully - one character can ruin everything!
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    // Send "checking..." message with random phrase
    const checkingMsg = await bot.sendMessage(chatId, getRandomPhrase('checking'));
    
    try {
        // Check allocation
        const result = await checkAllocation(address);
        
        if (result.success) {
            const allocation = result.allocation;
            const isZero = allocation === '0';
            
            let responseMessage;
            
            if (isZero) {
                responseMessage = `
${getRandomPhrase('noAllocation')}

**Address:** \`${address}\`
**Allocation:** **0** tokens 😢

🔗 **Lineascan:** [View wallet](${getLineascanUrl(address)})

💡 Don't give up! Maybe next time you'll be luckier!
                `;
            } else {
                responseMessage = `
${getRandomPhrase('success')}

**Address:** \`${address}\`
**Your allocation:** **${allocation}** tokens 🎉

**Details:**
• Raw value: \`${result.rawValue}\`
• Processed allocation: \`${allocation}\`
• Contract: \`${CONTRACT_ADDRESS}\`

🔗 **Lineascan:** [View wallet](${getLineascanUrl(address)})

💰 Congratulations on your allocation! 🚀
                `;
            }
            
            bot.editMessageText(responseMessage, {
                chat_id: chatId,
                message_id: checkingMsg.message_id,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } else {
            const errorMessage = `
${getRandomPhrase('errors')}

**Address:** \`${address}\`
**Error:** ${result.error}

Possible reasons:
• Network issues
• RPC overload
• Contract temporarily unavailable

🔄 Try again in a minute!
            `;
            
            bot.editMessageText(errorMessage, {
                chat_id: chatId,
                message_id: checkingMsg.message_id,
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        console.error('Error in handleAllocationCheck:', error);
        
        bot.editMessageText(`
${getRandomPhrase('errors')}

An unexpected error occurred. Try again!

**Error:** ${error.message}
        `, {
            chat_id: chatId,
            message_id: checkingMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
}

// Batch allocation check handler
async function handleBatchCheck(chatId, addresses) {
    const checkingMsg = await bot.sendMessage(chatId, 
        `${getRandomPhrase('batchStart')} 
        
🎯 **Checking ${addresses.length} wallets...**`
    );
    
    try {
        const batchResult = await checkBatchAllocations(addresses);
        const { results, summary } = batchResult;
        
        // Build response message
        let responseMessage = `
🎊 **Batch check completed!**

📊 **Statistics:**
• Total checked: ${summary.total}
• Found with allocation: ${summary.found}
• Total allocation: ${summary.totalAllocation} tokens

`;

        if (summary.found > 0) {
            responseMessage += `\n💰 **Found allocations:**\n`;
            
            results.forEach((result, index) => {
                if (result.success && result.allocation !== '0') {
                    responseMessage += `${index + 1}. [${result.address.slice(0, 8)}...](${getLineascanUrl(result.address)}) → **${result.allocation}** tokens\n`;
                }
            });
        }
        
        // Show zero allocations (first 10)
        const zeroResults = results.filter(r => r.success && r.allocation === '0');
        if (zeroResults.length > 0) {
            responseMessage += `\n😔 **Zero allocations (first 10):**\n`;
            zeroResults.slice(0, 10).forEach((result, index) => {
                responseMessage += `${index + 1}. [${result.address.slice(0, 8)}...](${getLineascanUrl(result.address)}) → 0\n`;
            });
            
            if (zeroResults.length > 10) {
                responseMessage += `... and ${zeroResults.length - 10} more addresses with zero allocation\n`;
            }
        }
        
        // Show errors if any
        const errorResults = results.filter(r => !r.success);
        if (errorResults.length > 0) {
            responseMessage += `\n❌ **Errors (${errorResults.length}):**\n`;
            errorResults.slice(0, 5).forEach((result, index) => {
                responseMessage += `${index + 1}. ${result.address.slice(0, 8)}... - ${result.error}\n`;
            });
        }
        
        responseMessage += `\n🔥 **Check completed! Good luck with your tokens!** 🚀`;
        
        bot.editMessageText(responseMessage, {
            chat_id: chatId,
            message_id: checkingMsg.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        
    } catch (error) {
        console.error('Error in handleBatchCheck:', error);
        
        bot.editMessageText(`
${getRandomPhrase('errors')}

Error during batch check: ${error.message}

🔄 Try splitting your list into parts or check later.
        `, {
            chat_id: chatId,
            message_id: checkingMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
}

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});
