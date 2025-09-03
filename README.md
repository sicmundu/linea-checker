# Linea Allocation Checker Bot

Telegram bot for checking token allocation from Linea drop via EVM contract calls.

## Features

- Check token allocation through Linea contract
- Simple Telegram interface
- Secure read-only contract calls
- Automatic final allocation calculation
- Fast responses via RPC
- Batch checking up to 50 wallets
- Direct Lineascan links
- Enhanced address validation
- Multilingual support

## Requirements

- Node.js 16.0.0 or higher
- Telegram Bot Token
- Access to Linea RPC

## Installation and Setup

### 1. Clone and install dependencies

```bash
# Install dependencies
npm install
```

### 2. Environment configuration

```bash
# Copy example file
cp .env.example .env
```

Edit the `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Linea Network Configuration
LINEA_RPC_URL=https://rpc.linea.build
CONTRACT_ADDRESS=0x87bAa1694381aE3eCaE2660d97fe60404080Eb64

# Optional: Custom RPC URL
# CUSTOM_RPC_URL=your_custom_linea_rpc_url_here
```

### 3. Create Telegram bot

1. Find @BotFather in Telegram
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy token and add to `.env`

### 4. Start the bot

```bash
npm start
```

## Usage

### Bot commands:

- `/start` - Show welcome message
- `/help` - Show help information
- `/check <address>` - Check allocation for specific address

### Usage examples:

```
/check 0x1234567890123456789012345678901234567890
```

Or just send an Ethereum address:
```
0x1234567890123456789012345678901234567890
```

### Batch checking:

```
0x1234567890123456789012345678901234567890
0x5678901234567890123456789012345678901234
0x9012345678901234567890123456789012345678
```

## How it works

1. **Address input**: Bot receives Ethereum address from user
2. **Contract call**: Executes call to `calculateAllocation` contract function
3. **Result processing**: Received number is processed:
   - Divided by 10^18 (like wei to ether)
   - Only integer part is taken (floor)
4. **Return result**: User receives final allocation

### Contract information:

- **Contract address**: `0x87bAa1694381aE3eCaE2660d97fe60404080Eb64`
- **Network**: Linea Mainnet
- **Function**: `calculateAllocation(address user) -> uint256`
- **Call type**: View (read-only, no transactions)

## Project structure

```
linea_checker/
├── bot.js              # Main bot application
├── package.json        # Project dependencies
├── .env.example        # Environment variables template
├── .env               # Your environment variables (created by you)
├── .gitignore         # Git exclusions
├── ecosystem.config.js # PM2 configuration
├── setup.js           # Interactive setup script
├── test-contract.js   # Contract interaction testing
└── README.md          # This file
```

## Security

- Bot performs only read-only operations
- No private keys required
- No transactions are sent
- Only view calls to contract

## Troubleshooting

### Problem: "Polling error"
```bash
# Check bot token in .env file
# Make sure bot is not running elsewhere
```

### Problem: "Contract call failed"
```bash
# Check RPC URL
# Check internet connection
# Try different RPC endpoint
```

### Problem: "Invalid address"
```bash
# Make sure address starts with 0x
# Check that address contains 40 hex characters after 0x
```

## Example output

```
User: 0x4EA6eaf5279A69219A0D4e5c3e2a9542Ee6Cf084

Bot: Checking your allocation...

Bot: Allocation Found!
     Address: 0x4EA6eaf5279A69219A0D4e5c3e2a9542Ee6Cf084
     Your Allocation: 72945 tokens
     
     Details:
     • Raw contract value: 72945677490451000000000
     • Processed allocation: 72945
     • Contract: 0x87bAa1694381aE3eCaE2660d97fe60404080Eb64
     • Lineascan: https://lineascan.build/address/0x4EA6eaf5279A69219A0D4e5c3e2a9542Ee6Cf084
```

## PM2 Deployment

The project includes PM2 ecosystem configuration for production deployment:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Stop
pm2 stop linea-checker

# Restart
pm2 restart linea-checker
```

## Development roadmap

- [ ] Add result caching
- [ ] Add usage statistics
- [ ] Support multiple address checking
- [ ] Web interface
- [ ] Allocation change notifications

## License

MIT License

## Support

If you have questions or issues, create an issue in the repository or contact the developer.

---

**Note**: This bot is designed only for allocation checking and does not perform any transactions with your funds.