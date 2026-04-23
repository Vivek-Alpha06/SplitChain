#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol, Vec
};

const LEDGER_THRESHOLD: u32 = 7776000; // ~90 days in Stellar ledgers

// ==================== DATA STRUCTURES ====================

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum DataKey {
    Split(u64),              // Split ID -> SplitData
    UserSplits(Address),     // User -> Vec<split_ids>
    SplitCounter,            // Total splits created
    ParticipantShare(u64, Address), // Split ID + Participant -> Share data
    Settlement(u64),         // Split ID -> SettlementData
}

#[derive(Clone)]
#[contracttype]
pub struct SplitData {
    pub id: u64,
    pub creator: Address,
    pub title: Symbol,
    pub total_amount: i128,
    pub token: Address,
    pub created_at: u64,
    pub settled: bool,
    pub participants: Vec<Address>,
}

#[derive(Clone)]
#[contracttype]
pub struct ParticipantShare {
    pub participant: Address,
    pub share_percentage: u32, // 0-100
    pub amount_to_pay: i128,
    pub amount_paid: i128,
    pub is_settled: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct SettlementData {
    pub split_id: u64,
    pub total_paid: i128,
    pub total_amounts: i128,
    pub participant_count: u32,
    pub settled_at: u64,
}

// ==================== CONTRACT ====================

#[contract]
pub struct splitchainEscrow;

#[contractimpl]
impl splitchainEscrow {
    /// Initialize the contract (called once)
    pub fn init(env: Env) {
        let counter_key = DataKey::SplitCounter;
        if !env.storage().instance().has(&counter_key) {
            env.storage().instance().set(&counter_key, &0u64);
            env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);
        }
    }

    /// Create a new split
    /// 
    /// # Arguments
    /// * `creator` - Address of split creator (must authorize)
    /// * `title` - Name of the split
    /// * `total_amount` - Total amount to split
    /// * `token` - Token address (e.g., XLM native or USDC)
    /// * `participants` - Vector of participant addresses
    /// * `shares` - Vector of share percentages (must sum to 100)
    pub fn create_split(
        env: Env,
        creator: Address,
        title: Symbol,
        total_amount: i128,
        token: Address,
        participants: Vec<Address>,
        shares: Vec<u32>,
    ) -> u64 {
        creator.require_auth();
        
        assert!(!participants.is_empty(), "Participants cannot be empty");
        assert_eq!(participants.len(), shares.len(), "Participants and shares length mismatch");
        assert!(total_amount > 0, "Amount must be positive");
        
        // Verify shares sum to 100
        let total_share: u32 = shares.iter().fold(0u32, |acc, x| acc.saturating_add(x));
        assert_eq!(total_share, 100, "Shares must sum to 100");

        // Get next split ID
        let counter_key = DataKey::SplitCounter;
        let mut counter: u64 = env.storage().instance().get(&counter_key).unwrap_or(0);
        counter += 1;

        let split_id = counter;
        
        // Create split data
        let split = SplitData {
            id: split_id,
            creator: creator.clone(),
            title,
            total_amount,
            token,
            created_at: env.ledger().timestamp(),
            settled: false,
            participants: participants.clone(),
        };

        // Calculate and store each participant's share
        for i in 0..participants.len() {
            let participant = participants.get(i).unwrap();
            let share_pct = shares.get(i).unwrap();
            let share_amount = (total_amount * share_pct as i128) / 100;

            let participant_key = DataKey::ParticipantShare(split_id, participant.clone());
            let participant_data = ParticipantShare {
                participant: participant.clone(),
                share_percentage: share_pct,
                amount_to_pay: share_amount,
                amount_paid: 0,
                is_settled: false,
            };
            
            env.storage().instance().set(&participant_key, &participant_data);
            env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);
        }

        // Store split data
        let split_key = DataKey::Split(split_id);
        env.storage().instance().set(&split_key, &split);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);

        // Update creator's splits list
        let creator_key = DataKey::UserSplits(creator.clone());
        let mut user_splits: Vec<u64> = env.storage().instance()
            .get(&creator_key)
            .unwrap_or_else(|| Vec::new(&env));
        user_splits.push_back(split_id);
        env.storage().instance().set(&creator_key, &user_splits);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);

        // Update counter
        env.storage().instance().set(&counter_key, &counter);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);

        // Publish event
        env.events().publish(
            ("split_created", split_id),
            (creator, total_amount)
        );

        split_id
    }

    /// Deposit funds for a share
    pub fn deposit_share(
        env: Env,
        payer: Address,
        split_id: u64,
        amount: i128,
    ) {
        payer.require_auth();

        let split_key = DataKey::Split(split_id);
        let split: SplitData = env.storage().instance()
            .get(&split_key)
            .expect("Split not found");

        assert!(!split.settled, "Split already settled");
        assert!(amount > 0, "Amount must be positive");

        let participant_key = DataKey::ParticipantShare(split_id, payer.clone());
        let mut participant: ParticipantShare = env.storage().instance()
            .get(&participant_key)
            .expect("Participant not found in split");

        // Update amount paid
        participant.amount_paid += amount;
        assert!(
            participant.amount_paid <= participant.amount_to_pay,
            "Payment exceeds share amount"
        );

        // Check if settled
        if participant.amount_paid >= participant.amount_to_pay {
            participant.is_settled = true;
        }

        env.storage().instance().set(&participant_key, &participant);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);

        // Publish event
        env.events().publish(
            ("share_deposit", split_id),
            (payer, amount)
        );
    }

    /// Get split details
    pub fn get_split(env: Env, split_id: u64) -> SplitData {
        let split_key = DataKey::Split(split_id);
        env.storage().instance()
            .get(&split_key)
            .expect("Split not found")
    }

    /// Get participant's share details
    pub fn get_participant_share(
        env: Env,
        split_id: u64,
        participant: Address,
    ) -> ParticipantShare {
        let participant_key = DataKey::ParticipantShare(split_id, participant.clone());
        env.storage().instance()
            .get(&participant_key)
            .expect("Participant not found")
    }

    /// Settle a split (mark as complete)
    pub fn settle_split(env: Env, split_id: u64) {
        let split_key = DataKey::Split(split_id);
        let mut split: SplitData = env.storage().instance()
            .get(&split_key)
            .expect("Split not found");

        assert!(!split.settled, "Split already settled");

        // Verify all participants have paid
        for participant in split.participants.iter() {
            let p_key = DataKey::ParticipantShare(split_id, participant.clone());
            let p_share: ParticipantShare = env.storage().instance()
                .get(&p_key)
                .expect("Participant not found");
            
            assert!(p_share.is_settled, "Not all participants have settled");
        }

        // Mark as settled
        split.settled = true;
        env.storage().instance().set(&split_key, &split);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);

        // Store settlement data
        let settlement_key = DataKey::Settlement(split_id);
        let settlement = SettlementData {
            split_id,
            total_paid: split.total_amount,
            total_amounts: split.total_amount,
            participant_count: split.participants.len() as u32,
            settled_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&settlement_key, &settlement);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_THRESHOLD);

        // Publish event
        env.events().publish(
            ("split_settled", split_id),
            split.total_amount
        );
    }

    /// Get user's splits
    pub fn get_user_splits(env: Env, user: Address) -> Vec<u64> {
        let user_key = DataKey::UserSplits(user);
        env.storage().instance()
            .get(&user_key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Check if split is settled
    pub fn is_split_settled(env: Env, split_id: u64) -> bool {
        let split_key = DataKey::Split(split_id);
        let split: SplitData = env.storage().instance()
            .get(&split_key)
            .expect("Split not found");
        split.settled
    }

    /// Get settlement details
    pub fn get_settlement(env: Env, split_id: u64) -> SettlementData {
        let settlement_key = DataKey::Settlement(split_id);
        env.storage().instance()
            .get(&settlement_key)
            .expect("Settlement not found")
    }
}
