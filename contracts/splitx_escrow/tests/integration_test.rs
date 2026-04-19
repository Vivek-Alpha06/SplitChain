#![cfg(test)]

mod test {
    use soroban_sdk::{Env, Address, Symbol};
    use splitx_escrow::SplitXEscrow;

    fn create_test_addresses(env: &Env) -> (Address, Address, Address, Address) {
        (
            Address::random(env),
            Address::random(env),
            Address::random(env),
            Address::random(env),
        )
    }

    fn create_token_address(env: &Env) -> Address {
        Address::random(env)
    }

    #[test]
    fn test_contract_initialization() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());
        // If initialization fails, test will panic
        assert!(true, "Contract initialized successfully");
    }

    #[test]
    fn test_create_split_basic() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        // Create participants vector
        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        
        // Create shares (50-50 split)
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        // Create split
        env.mock_all_auths();
        let split_id = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("dinner"),
            1000i128,
            token.clone(),
            participants,
            shares,
        );

        assert_eq!(split_id, 1, "First split should have ID 1");
    }

    #[test]
    fn test_create_split_three_way() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, p1, p2, p3) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, p1.clone(), p2.clone(), p3.clone()];
        let shares = soroban_sdk::vec![&env, 33u32, 33u32, 34u32]; // Sums to 100

        env.mock_all_auths();
        let split_id = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("party"),
            3000i128,
            token.clone(),
            participants,
            shares,
        );

        assert_eq!(split_id, 1, "Split created successfully");
        
        // Verify split details
        let split = SplitXEscrow::get_split(env.clone(), split_id);
        assert_eq!(split.total_amount, 3000i128, "Correct total amount");
        assert_eq!(split.settled, false, "Split not settled initially");
    }

    #[test]
    fn test_deposit_share() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        env.mock_all_auths();
        
        let split_id = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("lunch"),
            2000i128,
            token.clone(),
            participants,
            shares,
        );

        // Participant 1 deposits their share (50% of 2000 = 1000)
        SplitXEscrow::deposit_share(
            env.clone(),
            participant1.clone(),
            split_id,
            1000i128,
        );

        // Check participant share after deposit
        let share = SplitXEscrow::get_participant_share(
            env.clone(),
            split_id,
            participant1.clone(),
        );

        assert_eq!(share.amount_paid, 1000i128, "Amount paid is correct");
        assert_eq!(share.is_settled, true, "Participant marked as settled");
    }

    #[test]
    fn test_get_participant_share() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 40u32, 60u32];

        env.mock_all_auths();
        
        let split_id = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("bills"),
            1000i128,
            token.clone(),
            participants,
            shares,
        );

        let share = SplitXEscrow::get_participant_share(
            env.clone(),
            split_id,
            participant1.clone(),
        );

        assert_eq!(share.share_percentage, 40u32, "Correct share percentage");
        assert_eq!(share.amount_to_pay, 400i128, "Correct amount to pay (40% of 1000)");
        assert_eq!(share.amount_paid, 0i128, "No payment yet");
    }

    #[test]
    fn test_settle_split() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        env.mock_all_auths();

        let split_id = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("dinner"),
            2000i128,
            token.clone(),
            participants,
            shares,
        );

        // Both participants deposit
        SplitXEscrow::deposit_share(env.clone(), participant1.clone(), split_id, 1000i128);
        SplitXEscrow::deposit_share(env.clone(), participant2.clone(), split_id, 1000i128);

        // Settle the split
        SplitXEscrow::settle_split(env.clone(), split_id);

        // Verify split is settled
        assert!(
            SplitXEscrow::is_split_settled(env.clone(), split_id),
            "Split is marked as settled"
        );

        // Get settlement details
        let settlement = SplitXEscrow::get_settlement(env.clone(), split_id);
        assert_eq!(settlement.split_id, split_id, "Settlement split ID matches");
        assert_eq!(settlement.total_paid, 2000i128, "Total paid is correct");
        assert_eq!(settlement.participant_count, 2u32, "Correct participant count");
    }

    #[test]
    fn test_get_user_splits() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        env.mock_all_auths();

        // Create first split
        let _split_id_1 = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("lunch"),
            1000i128,
            token.clone(),
            participants.clone(),
            shares.clone(),
        );

        // Create second split
        let _split_id_2 = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("dinner"),
            2000i128,
            token.clone(),
            participants,
            shares,
        );

        // Get user's splits
        let user_splits = SplitXEscrow::get_user_splits(env.clone(), creator.clone());
        assert_eq!(user_splits.len(), 2, "User has 2 splits");
    }

    #[test]
    fn test_multiple_splits_sequential_ids() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        env.mock_all_auths();

        let split_id_1 = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("split1"),
            1000i128,
            token.clone(),
            participants.clone(),
            shares.clone(),
        );

        let split_id_2 = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("split2"),
            2000i128,
            token.clone(),
            participants,
            shares,
        );

        assert_eq!(split_id_1, 1, "First split ID is 1");
        assert_eq!(split_id_2, 2, "Second split ID is 2");
    }

    #[test]
    fn test_partial_deposit() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        env.mock_all_auths();

        let split_id = SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("expenses"),
            2000i128,
            token.clone(),
            participants,
            shares,
        );

        // Participant 1 deposits half of their share
        SplitXEscrow::deposit_share(env.clone(), participant1.clone(), split_id, 500i128);

        let share = SplitXEscrow::get_participant_share(
            env.clone(),
            split_id,
            participant1.clone(),
        );

        assert_eq!(share.amount_paid, 500i128, "Partial payment recorded");
        assert_eq!(share.is_settled, false, "Not fully settled with partial payment");
    }

    #[test]
    #[should_panic(expected = "Shares must sum to 100")]
    fn test_invalid_shares_sum() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 40u32]; // Only sums to 90

        env.mock_all_auths();

        SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("invalid"),
            1000i128,
            token.clone(),
            participants,
            shares,
        );
    }

    #[test]
    #[should_panic(expected = "Participants cannot be empty")]
    fn test_empty_participants() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, _, _, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env];
        let shares = soroban_sdk::vec![&env];

        env.mock_all_auths();

        SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("empty"),
            1000i128,
            token.clone(),
            participants,
            shares,
        );
    }

    #[test]
    #[should_panic(expected = "Amount must be positive")]
    fn test_non_positive_amount() {
        let env = Env::default();
        SplitXEscrow::init(env.clone());

        let (creator, participant1, participant2, _) = create_test_addresses(&env);
        let token = create_token_address(&env);

        let participants = soroban_sdk::vec![&env, participant1.clone(), participant2.clone()];
        let shares = soroban_sdk::vec![&env, 50u32, 50u32];

        env.mock_all_auths();

        SplitXEscrow::create_split(
            env.clone(),
            creator.clone(),
            Symbol::short("zero"),
            0i128, // Invalid
            token.clone(),
            participants,
            shares,
        );
    }
}
