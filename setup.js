#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupBot() {
    console.log('🤖 Linea Allocation Checker Bot Setup\n');
    
    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
            console.log('✅ Setup cancelled. Using existing .env file.');
            rl.close();
            return;
        }
    }
    
    console.log('📝 Please provide the following information:\n');
    
    // Get Telegram Bot Token
    const botToken = await question('🔑 Telegram Bot Token (from @BotFather): ');
    
    if (!botToken || !botToken.includes(':')) {
        console.log('❌ Invalid bot token format. Please get a valid token from @BotFather');
        rl.close();
        return;
    }
    
    // Optional custom RPC
    console.log('\n🌐 RPC Configuration:');
    console.log('Default: https://rpc.linea.build (public Linea RPC)');
    const customRpc = await question('Custom RPC URL (optional, press Enter for default): ');
    
    // Create .env content
    let envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${botToken}

# Linea Network Configuration
LINEA_RPC_URL=https://rpc.linea.build
CONTRACT_ADDRESS=0x87bAa1694381aE3eCaE2660d97fe60404080Eb64
`;

    if (customRpc && customRpc.trim()) {
        envContent += `\n# Custom RPC URL
CUSTOM_RPC_URL=${customRpc.trim()}`;
    }
    
    // Write .env file
    try {
        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ Configuration saved to .env file!');
        
        console.log('\n🚀 Setup complete! You can now start the bot with:');
        console.log('   npm start');
        
        console.log('\n📖 Additional commands:');
        console.log('   npm run test    - Test contract interaction');
        console.log('   npm start       - Start the bot');
        
    } catch (error) {
        console.log('❌ Error writing .env file:', error.message);
    }
    
    rl.close();
}

setupBot().catch(console.error);