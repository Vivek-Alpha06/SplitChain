# 🏗️ SplitChain Architecture

## 📌 Overview
SplitChain is a decentralized bill-splitting application built on the Stellar blockchain.
Users connect their Stellar wallets, create bill splits, and settle payments through
a Soroban smart contract acting as a trustless escrow.

## Architecture Diagram

User Browser
    |
    v
[React Frontend (index.html + app.js)]
    |           |              |
    v           v              v
[Albedo/   [Firebase      [Stellar SDK]
 Freighter] Firestore]         |
  Wallet     (split data)       v
                        [Stellar Testnet RPC]
                               |
                               v
                    [Soroban Smart Contract]
                    (splitchainEscrow)



## 🧩 Components

### 1. Frontend (index.html, app.js, style.css)
- React-based SPA loaded via SystemJS CDN (no build step needed)
- Handles wallet connection, split creation UI, payment flow
- Displays live XLM balance and transaction history

### 2. Smart Contract (contracts/SplitChain_escrow/src/lib.rs)
- Written in Rust using Soroban SDK
- Functions: create_split, add_participant, deposit_share, settle_split
- Stores split data on-chain with 90-day TTL
- Emits events for each deposit and settlement

### 3. Wallet Integration
- Albedo: browser-based Stellar signer (no extension needed)
- Freighter: browser extension wallet
- Both sign transactions locally — private keys never leave user device

### 4. Firebase Firestore
- Stores split group metadata (names, amounts, participants)
- Used as off-chain index for fast UI rendering
- Blockchain is source of truth for all payment finality

### 5. Node.js Server (server.js)
- Simple static file server for local development
- Serves HTML/JS/CSS on http://127.0.0.1:8080

## 🔗 Data Flow: Creating and Settling a Split
1. User connects wallet (Albedo or Freighter)
2. User creates split — stored in Firebase + contract called via create_split()
3. Friends receive split link, connect their wallets
4. Each friend calls deposit_share() on the contract
5. When all paid, settle_split() is called
6. All transactions verifiable on Stellar Explorer

## Security
- Smart contract enforces payment rules — no central authority
- Users authorize every transaction with their private wallet key
- Firebase rules restrict data access per user


---

## 💡 Other Features

### 💸 Send XLM
- Users can send XLM to other users using wallet addresses
- Transaction is signed using connected wallet (Albedo / Freighter)
- Executed securely on Stellar Testnet
- Transaction result is displayed instantly

---

### 🔄 Swap Feature
- Users can swap XLM to other supported assets (if enabled)
- Swap is executed through Stellar network
- Ensures fast and low-cost conversion

---

### 📥 Receive Option
- Users can view their wallet address to receive funds
- Helps other users send XLM easily
- Acts as a public receiving endpoint

---

### 📜 Transaction History
- Stores all transaction records
- Displays:
  - Sent transactions
  - Received transactions
  - Split payments
- Helps users track all activities

---

### 📊 Receive History
- Shows all incoming transactions
- Helps users verify received payments
- Data fetched from Stellar network

---

## 🔄 Updated Workflow

1. User connects wallet
2. User selects action:
   - Send XLM
   - Split payment
   - Swap asset
3. User enters details (address, amount)
4. Wallet signs transaction
5. Smart contract executes (if required)
6. Transaction sent to Stellar network
7. Result and history updated in UI

---
## Architecture Diagram 

 screenshot/ARCHITECHTURE.png
