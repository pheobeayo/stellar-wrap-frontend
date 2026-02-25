#!/bin/bash
# Setup script for contract address configuration

CONTRACT_ADDRESS="CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE"

echo "🔧 Setting up contract address configuration..."
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  echo "Creating .env.local file..."
  cat > .env.local << EOL
# Contract Addresses for Stellar Wrap
# Testnet contract address (from test file)
NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET=${CONTRACT_ADDRESS}

# Mainnet contract address (to be configured when available)
# NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET=YOUR_MAINNET_CONTRACT_ADDRESS_HERE
EOL
  echo "✅ Created .env.local with testnet contract address"
else
  echo "⚠️  .env.local already exists"
  echo "Add this line to it:"
  echo "NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET=${CONTRACT_ADDRESS}"
fi

echo ""
echo "📋 Contract Address: ${CONTRACT_ADDRESS}"
echo "✅ Valid format: 56 characters, C-prefix, base32"
echo ""
echo "💡 To use this configuration:"
echo "   1. Restart your dev server: npm run dev"
echo "   2. The contract address will be loaded automatically"
