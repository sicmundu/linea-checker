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
        '🔥 Hold the fuck up, checking your shit...',
        '⚡ Calling the goddamn contract, wait up...',
        '🎯 Scanning this address like a mad dog...',
        '💀 Digging through blockchain hell for your tokens...',
        '🚀 Launching nuclear scan, brace yourself...',
        '🔮 Reading the fucking crystal ball...',
        '⛓️ Chaining up the contract, let\'s see what you got...'
    ],
    success: [
        '💰 Holy shit! Found your fucking treasure!',
        '🎉 Jackpot, motherfucker! Here\'s your loot:',
        '🔥 Damn right! Your allocation is here:',
        '💎 Sweet Jesus! Look at this beautiful allocation:',
        '🚀 Boom! Your tokens are locked and loaded:',
        '⚡ Lightning fucking strikes! Your share:',
        '🎯 Bulls-fucking-eye! Check this out:'
    ],
    noAllocation: [
        '💔 Shit... contract says you got nothing, buddy',
        '😤 Fuck me sideways, zero allocation here',
        '🤷‍♂️ Contract is being a bitch, nothing found',
        '💸 Empty as my soul... sorry mate',
        '🔍 Searched everywhere, but you\'re broke here'
    ],
    batchStart: [
        '🔥 Time to fuck shit up! Mass checking incoming!',
        '💀 Unleashing chaos on your wallet army!',
        '⚡ Going ballistic on this address list!',
        '🚀 Nuclear batch mode activated, hold tight!',
        '🎯 About to wreck this list like a savage!'
    ],
    errors: [
        '💥 Well, fuck! Something exploded...',
        '🤬 Shit hit the fan, try again!',
        '🔧 This piece of shit broke, fixing it...',
        '⚠️ Damn glitch in the matrix!',
        '💀 System\'s being a bitch right now!'
    ]
};

function getRandomPhrase(category) {
    const categoryPhrases = phrases[category] || ['💥 Some shit is happening...'];
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
    const processedAddresses = new Set(); // Track processed addresses to avoid duplicates
    
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const normalizedAddress = address.toLowerCase();
        
        // Check if we already processed this address
        if (processedAddresses.has(normalizedAddress)) {
            results.push({
                address,
                success: true,
                allocation: 'duplicate',
                isDuplicate: true
            });
            continue;
        }
        
        processedAddresses.add(normalizedAddress);
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
            unique: processedAddresses.size,
            duplicates: addresses.length - processedAddresses.size,
            found: totalFound,
            totalAllocation: totalAllocation.toString()
        }
    };
}

// Bot command handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
💀 **Yo! I'm the Linea Allocation Bot!** 🔥

🖕 I'm not here to fuck around. I check your Linea allocation and that's it. No bullshit, no games.

**What I do:**
• 💎 Check your wallet allocation (one address)
• ⚡ Batch check up to 50 wallets (because I'm badass like that)
• 🔗 Give you Lineascan links
• 🤬 Understand any format you throw at me

**How to use this shit:**
📱 Single wallet: just send the damn address
📃 Multiple wallets: dump your list, any format

**Examples:**
\`0x1234...abcd\` - single wallet

\`\`\`
0x1234...abcd
0x5678...efgh  
0x9abc...1234
\`\`\`
Just paste your mess - I'll figure it out 💀

**Commands:**
/help - If you're too dumb to figure this out
/check <address> - Check specific address

🔥 **Let's see what you fucking got!** 🔥
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📖 **Help - Linea Allocation Bot** 💀

**How this shit works:**
• I call the calculateAllocation function on the Linea contract
• Contract: \`${CONTRACT_ADDRESS}\`
• Network: Linea Mainnet
• Result gets processed (divided by 10^18) to show your real allocation
• I give you Lineascan links so you can verify yourself

**Usage:**
• Send any Ethereum address and I'll check it
• Or use \`/check <address>\` if you're fancy
• Address format: 0x + 40 hex characters
• I can handle up to 50 addresses at once (try me!)

**Examples:**
\`/check 0x1234567890123456789012345678901234567890\`
\`0x1234567890123456789012345678901234567890\`

**Batch checking:**
\`\`\`
0x1111...
0x2222...
0x3333...
\`\`\`

Need more help? Figure it out yourself! 🖕
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
⚠️ **Whoa there, hotshot!**

I can only handle 50 addresses at once, you sent ${addresses.length}.
Split that shit up or send me the first 50.

🔥 I'm powerful but not fucking magical!
            `, { parse_mode: 'Markdown' });
            return;
        }
        
        await handleBatchCheck(chatId, addresses);
    } else if (text.length > 10) {
        // No valid addresses found but text is long enough
        bot.sendMessage(chatId, `
❌ **What the fuck is this garbage?**

I need valid Ethereum addresses: 0x + 40 hex characters

**Examples of addresses that don't suck:**
\`0x1234567890123456789012345678901234567890\`
\`0xabcdefabcdefabcdefabcdefabcdefabcdefabcd\`

💀 I'm smart but I can't read your mind, asshole!
        `, { parse_mode: 'Markdown' });
    }
});

// Main allocation check handler (single address)
async function handleAllocationCheck(chatId, address) {
    // Validate address format
    if (!isValidAddress(address)) {
        bot.sendMessage(chatId, `
❌ **Invalid fucking address!**

Address format: 0x + 40 hex characters

**Example:** \`0x1234567890123456789012345678901234567890\`

💀 Check your shit before wasting my time!
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
**Allocation:** **0** tokens 💸

🔗 **Lineascan:** [Check it yourself](${getLineascanUrl(address)})

🖕 Better luck next time, loser!
                `;
            } else {
                responseMessage = `
${getRandomPhrase('success')}

**Address:** \`${address}\`
**Your allocation:** **${allocation}** tokens 💰

**Details:**
• Raw value: \`${result.rawValue}\`
• Processed allocation: \`${allocation}\`
• Contract: \`${CONTRACT_ADDRESS}\`

🔗 **Lineascan:** [Verify this shit](${getLineascanUrl(address)})

🔥 Now fuck off and enjoy your tokens! 🚀
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
• Network is being a bitch
• RPC is overloaded
• Contract is having a bad day

🔄 Try again in a fucking minute!
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

Something fucked up royally. Try again!

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
🔥 **Batch check complete, motherfucker!**

📊 **Stats:**
• Total addresses: ${summary.total}
• Unique addresses: ${summary.unique}
• Duplicates found: ${summary.duplicates}
• Wallets with allocation: ${summary.found}
• **TOTAL ALLOCATION: ${summary.totalAllocation} tokens** 💰

`;

        if (summary.found > 0) {
            responseMessage += `\n💰 **Winners:**\n`;
            
            results.forEach((result, index) => {
                if (result.success && result.allocation !== '0' && !result.isDuplicate) {
                    responseMessage += `${index + 1}. [${result.address.slice(0, 8)}...](${getLineascanUrl(result.address)}) → **${result.allocation}** tokens\n`;
                }
            });
        }
        
        // Show zero allocations (first 10)
        const zeroResults = results.filter(r => r.success && r.allocation === '0' && !r.isDuplicate);
        if (zeroResults.length > 0) {
            responseMessage += `\n💸 **Broke ass wallets (first 10):**\n`;
            zeroResults.slice(0, 10).forEach((result, index) => {
                responseMessage += `${index + 1}. [${result.address.slice(0, 8)}...](${getLineascanUrl(result.address)}) → 0\n`;
            });
            
            if (zeroResults.length > 10) {
                responseMessage += `... and ${zeroResults.length - 10} more broke wallets\n`;
            }
        }
        
        // Show duplicates if any
        const duplicateResults = results.filter(r => r.isDuplicate);
        if (duplicateResults.length > 0) {
            responseMessage += `\n🔄 **Duplicate addresses (${duplicateResults.length}):**\n`;
            duplicateResults.slice(0, 5).forEach((result, index) => {
                responseMessage += `${index + 1}. ${result.address.slice(0, 8)}... - already checked\n`;
            });
            if (duplicateResults.length > 5) {
                responseMessage += `... and ${duplicateResults.length - 5} more duplicates\n`;
            }
        }
        
        // Show errors if any
        const errorResults = results.filter(r => !r.success);
        if (errorResults.length > 0) {
            responseMessage += `\n❌ **Fucked up addresses (${errorResults.length}):**\n`;
            errorResults.slice(0, 5).forEach((result, index) => {
                responseMessage += `${index + 1}. ${result.address.slice(0, 8)}... - ${result.error}\n`;
            });
        }
        
        responseMessage += `\n💀 **Done! Now get the fuck out!** 🖕`;
        
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

Batch check went to shit: ${error.message}

🔄 Split your list or try again later, dipshit.
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
