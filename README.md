# Blockchain-Based Certificate Verification System

A decentralized certificate management system built with Solidity smart contracts, React frontend, and Hardhat development framework. Enables secure issuance, verification, and revocation of digital certificates on the Ethereum blockchain.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [MetaMask Setup](#metamask-setup)
- [Smart Contract Usage](#smart-contract-usage)
- [Security Notes](#security-notes)
- [Deployment](#deployment)
- [Dependencies & Vulnerabilities](#dependencies--vulnerabilities)
- [License](#license)
## Overview

This smart contract provides a decentralized, transparent, and secure way to:
- Register accredited institutions
- Allow registered institutions to issue certificates to students
- Enable verification of issued certificates by the public
- Revoke certificates if needed
- Pause certificate operations during maintenance or security events

Built with:
- **Smart Contracts**: Solidity 0.8.19 with OpenZeppelin AccessControl & Pausable
- **Frontend**: React 18 + Vite + ethers.js v6
- **Development**: Hardhat + TypeChain for type-safe contract interactions
- **Local Testing**: Hardhat localhost network (chainId 31337)

## Features

- ✅ Institution registration with metadata (name, email, accreditation ID, country)
- ✅ Certificate issuance with full record tracking (IPFS hash, metadata, dates, grade)
- ✅ Certificate revocation with issuer verification
- ✅ Public certificate verification with detailed record retrieval
- ✅ Role-based access control (Admin, Issuer roles)
- ✅ Pausable contract for emergency operations management
- ✅ Full certificate record storage on-chain (student, issuer, institution, course, grade, expiry)
- ✅ Batch certificate retrieval for students and institutions




## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/certificate-verification.git
   cd certificate-verification
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file from template:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your contract address after deployment.

4. Compile the smart contract:
   ```bash
   npx hardhat compile
   ```

## Running Locally

1. **Start Hardhat Local Network** (in a terminal):
   ```bash
   npx hardhat node
   ```
   This runs a local Ethereum network on `http://127.0.0.1:8545` with chainId `31337`.

2. **Deploy the Contract** (in another terminal):
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
   Copy the deployed contract address and update `.env`:
   ```
   VITE_CONTRACT_ADDRESS=0x...
   ```

3. **Start the Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   Opens React app at `http://localhost:3000/`

4. **Run Tests** (optional):
   ```bash
   npx hardhat test
   ```
   Expected output: 4 passing tests ✓

## MetaMask Setup

To interact with the local network:

1. Open MetaMask → Settings → Networks → Add a network
2. Configure as follows:
   - **Network Name**: Localhost 31337
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
3. Import a Hardhat account:
   - In MetaMask, click "Import Account"
   - Use one of the private keys displayed when you ran `npx hardhat node`
   - Example: `0xac0974bec39a17e36ba4a6b4d238ff944bacb476caded732d4fe52559ca51fef` (first Hardhat account)
4. Verify connection in MetaMask (should show "Localhost 31337" network)

## Smart Contract Usage

### Issue Certificate

Only addresses with `ISSUER_ROLE` can issue certificates:

```javascript
await contract.issueCertificateWithRecord(
  certificateId,        // unique ID
  studentAddress,       // recipient address
  ipfsHash,             // IPFS hash of certificate document
  institutionName,      // issuing institution
  courseName,           // course/program name
  grade,                // grade/score
  expiryDate            // expiration timestamp
);
```

### Verify Certificate

Anyone can verify a certificate:

```javascript
const [isValid, record] = await contract.verifyCertificate(certificateId);
// Returns: isValid (bool), CertificateRecord struct
```

### Revoke Certificate

Issuers can revoke their own certificates:

```javascript
await contract.revokeCertificate(certificateId);
```

### Pause/Unpause

Admin can pause all operations:

```javascript
await contract.pause();   // Pauses all certificate operations
await contract.unpause(); // Resumes operations
```

## Security Notes

### Environment Variables

- **NEVER commit `.env`** to version control (already in `.gitignore`)
- **Use `.env.example`** as template with placeholder values
- For testnet/mainnet deployments, use:
  ```bash
  PRIVATE_KEY=0x...          # Deployment account private key
  SEPOLIA_URL=https://...    # Sepolia testnet RPC
  MAINNET_URL=https://...    # Mainnet RPC (if deploying to mainnet)
  ETHERSCAN_API_KEY=...      # For contract verification
  ```

### Best Practices

1. **Local Development**: Use Hardhat's default test accounts—never use these in production
2. **Testnet Deployment**: Use a dedicated testnet account with limited funds (Sepolia faucet)
3. **Mainnet Deployment**: Use a hardware wallet or secure key management service
4. **Private Keys**: Always store in environment variables or secure vaults—never hardcode
5. **Role Assignment**: Only grant `ISSUER_ROLE` to trusted institutions
6. **Pause Function**: Use to halt operations during security incidents

### Known Dependency Vulnerabilities

Current audit shows **35 low-severity vulnerabilities** (critical/high resolved):

- **ethers.js v5**: Contains indirect elliptic curve vulnerabilities (no fix without major version upgrade)
- **Hardhat ecosystem**: Transitive dependencies in mocha, diff, and undici (no-fix issues)
- **Vite 7.3.1**: Recently upgraded from v4 (breaking change applied)

**Mitigation**: These are development/testing dependencies only and do not affect production contracts or runtime security. Consider upgrading to ethers.js v6 for critical production deployments.

Run `npm audit` for detailed vulnerability report.

## Deployment

### Deploy to Sepolia Testnet

1. Update `hardhat.config.ts` with Sepolia RPC and account
2. Add Sepolia configuration to `hardhat.config.ts`:
   ```typescript
   sepolia: {
     url: process.env.SEPOLIA_URL,
     accounts: [process.env.PRIVATE_KEY]
   }
   ```
3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```


### Deploy to Mainnet

⚠️ **Production deployments require**: Hardware wallet, extensive testing, security audit, mainnet RPC key

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Dependencies & Vulnerabilities

### Audit Results

Last audit (after remediation): **35 low-severity vulnerabilities** (0 critical, 0 high, 0 moderate)

### Details

- **elliptic** (ethers.js v5 dependency): Cryptographic implementation risk. Upgrade to ethers.js v6 for production.
- **diff, mocha, undici**: Development/testing dependencies with no available fixes. Do not affect production.
- **cookie, tmp**: Low-severity issues in development utilities.

### Mitigation Strategy

- ✅ Critical/high vulnerabilities: **RESOLVED**
- Development dependencies only: Accept low-risk items for now
- Production recommendation: Upgrade to ethers.js v6 for long-term security

Run `npm audit` to view full vulnerability tree.

## Roles

- **DEFAULT_ADMIN_ROLE**: Deploy account; can assign/revoke roles and pause contract
- **ISSUER_ROLE**: Institutions; can issue, revoke, and query certificates

## License

This project is provided as-is for educational and development purposes. Ensure proper security audits before production use.

