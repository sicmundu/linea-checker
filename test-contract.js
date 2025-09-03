require('dotenv').config();
const { ethers } = require('ethers');

// Test configuration
const CONTRACT_ADDRESS = '0x87bAa1694381aE3eCaE2660d97fe60404080Eb64';
const LINEA_RPC_URL = 'https://rpc.linea.build';

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

// Test function
async function testContractInteraction() {
    try {
        console.log('🧪 Testing Linea contract interaction...');
        console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
        console.log(`🌐 RPC: ${LINEA_RPC_URL}`);
        
        // Initialize provider and contract
        const provider = new ethers.JsonRpcProvider(LINEA_RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        // Test with a sample address (this is a common test address)
        const testAddress = '0x0000000000000000000000000000000000000000';
        
        console.log(`\n🔍 Testing with address: ${testAddress}`);
        
        // Call the contract function
        const result = await contract.calculateAllocation(testAddress);
        
        console.log(`✅ Contract call successful!`);
        console.log(`📊 Raw result: ${result.toString()}`);
        
        // Test the formatting function
        const allocation = BigInt(result.toString());
        const divisor = BigInt('1000000000000000000'); // 10^18
        const finalAllocation = allocation / divisor;
        
        const formattedResult = finalAllocation.toString();
        
        console.log(`💰 Formatted allocation: ${formattedResult}`);
        
        // Test network connectivity
        const blockNumber = await provider.getBlockNumber();
        console.log(`🔗 Current Linea block: ${blockNumber}`);
        
        console.log('\n✅ All tests passed! The bot should work correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('network')) {
            console.log('\n💡 Suggestion: Check your internet connection or try a different RPC URL');
        } else if (error.message.includes('contract')) {
            console.log('\n💡 Suggestion: Verify the contract address and ABI');
        }
        
        process.exit(1);
    }
}

// Run the test
testContractInteraction();