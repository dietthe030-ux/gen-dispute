import pytest
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

def test_create_order_positive_escrow(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    # Seller is alice, buyer is bob
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Test Item"
        )
        
    order = contract.get_order(0)
    assert order["status"] == "OPEN"
    assert order["seller"] == direct_alice
    assert order["buyer"] == direct_bob
    assert order["escrow_amount"] == 1000
    assert order["listing_url"] == "https://listing.url"
    assert order["listing_snapshot"] == "Vintage Rolex Submariner watch in excellent condition"
    assert order["item_description"] == "Test Item"
    assert order["order_id"] == 0
    assert contract.get_order_count() == 1

def test_multiple_orders_have_isolated_state(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        first_order_id = contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "First item"
        )

    with direct_vm.prank(direct_alice):
        direct_vm.value = 2500
        second_order_id = contract.create_order(
            direct_charlie,
            "https://listing.url/rolex_v1",
            "Version A: Rolex watch including original box and papers",
            "Second item"
        )

    assert first_order_id == 0
    assert second_order_id == 1
    assert contract.get_order_count() == 2

    first_order = contract.get_order(0)
    second_order = contract.get_order(1)

    assert first_order["buyer"] == direct_bob
    assert first_order["escrow_amount"] == 1000
    assert first_order["item_description"] == "First item"
    assert first_order["status"] == "OPEN"

    assert second_order["buyer"] == direct_charlie
    assert second_order["escrow_amount"] == 2500
    assert second_order["item_description"] == "Second item"
    assert second_order["status"] == "OPEN"

def test_dispute_settlement_does_not_modify_other_order(
    direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Disputed item"
        )

    with direct_vm.prank(direct_alice):
        direct_vm.value = 2500
        contract.create_order(
            direct_charlie,
            "https://listing.url/rolex_v1",
            "Version A: Rolex watch including original box and papers",
            "Untouched item"
        )

    direct_vm.mock_web(
        "https://evidence.url",
        {"status": 200, "body": "The received watch matches the listing"}
    )
    direct_vm.mock_llm(r".*", json.dumps({
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "The item matches the listing.",
        "listing_facts": ["Vintage watch"],
        "evidence_facts": ["Matching vintage watch received"]
    }))

    def gl_call_hook(vm, request):
        if "EthSend" in request:
            return {"ok": None}
        return None

    direct_vm._gl_call_hook = gl_call_hook

    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "Verify the delivered item", "https://evidence.url")

    assert direct_vm.run_validator() is True

    settled_order = contract.get_order(0)
    untouched_order = contract.get_order(1)
    assert settled_order["status"] == "PAID_OUT"
    assert settled_order["seller_payout"] == 1000
    assert untouched_order["status"] == "OPEN"
    assert untouched_order["escrow_amount"] == 2500
    assert untouched_order["dispute_attempts"] == 0
    assert untouched_order["buyer_payout"] == 0
    assert untouched_order["seller_payout"] == 0

def test_unknown_order_id_is_rejected(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.expect_revert("Order does not exist"):
        contract.get_order(999)

    with direct_vm.expect_revert("Order does not exist"):
        with direct_vm.prank(direct_alice):
            contract.open_dispute(999, "reason", "https://evidence.url")

def test_reject_zero_escrow(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.expect_revert("Escrow amount must be positive"):
        with direct_vm.prank(direct_alice):
            direct_vm.value = 0
            contract.create_order(
                direct_bob,
                "https://listing.url",
                "Vintage Rolex Submariner watch in excellent condition",
                "Test Item"
            )

def test_buyer_cannot_be_seller(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.expect_revert("Buyer cannot be seller"):
        with direct_vm.prank(direct_alice):
            direct_vm.value = 1000
            contract.create_order(
                direct_alice,
                "https://listing.url",
                "Vintage Rolex Submariner watch in excellent condition",
                "Test Item"
            )

def test_invalid_url_scheme(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.expect_revert("Invalid URL scheme"):
        with direct_vm.prank(direct_alice):
            direct_vm.value = 1000
            contract.create_order(
                direct_bob,
                "ftp://listing.url",
                "Vintage Rolex Submariner watch in excellent condition",
                "Test Item"
            )

def test_create_order_mismatched_snapshot_rejection(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.expect_revert("Listing snapshot does not match the registered content for this URL"):
        with direct_vm.prank(direct_alice):
            direct_vm.value = 1000
            contract.create_order(
                direct_bob,
                "https://listing.url",
                "Mismatched snapshot description content",
                "Test Item"
            )

def test_buyer_access_control(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Test Item"
        )
        
    with direct_vm.expect_revert("Only buyer can open dispute"):
        with direct_vm.prank(direct_charlie):
            contract.open_dispute(0, "reasons", "https://evidence.url")

def test_dispute_resolved_tier_0(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Perfect condition watch received"})
    
    llm_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "Watch dial is original and matches listing.",
        "listing_facts": ["Original watch dial"],
        "evidence_facts": ["Original watch dial received"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    # Track EVM payout transfers
    eth_sends = []
    def gl_call_hook(vm, request):
        if "EthSend" in request:
            eth_sends.append(request["EthSend"])
            return {"ok": None}
        return None
    direct_vm._gl_call_hook = gl_call_hook
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "item matches description", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    assert order["refund_tier"] == 0
    assert order["buyer_payout"] == 0
    assert order["seller_payout"] == 1000
    assert order["outcome"] == "MATCHES_DESCRIPTION"
    
    # Assert correct payout recipients and values
    assert len(eth_sends) == 1
    assert direct_vm._to_bytes(eth_sends[0]["address"]) == direct_alice
    assert eth_sends[0]["value"] == 1000

def test_dispute_resolved_tier_50(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url/rolex_v1",
            "Version A: Rolex watch including original box and papers",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Rolex watch received, but missing box and papers"})
    
    llm_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "PARTIAL_MISMATCH",
        "evidence_sufficient": True,
        "refund_tier": 50,
        "reason_code": "PARTIAL_MISMATCH",
        "summary": "Missing box and papers.",
        "listing_facts": ["Original box and papers included"],
        "evidence_facts": ["Generic box only, papers missing"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    eth_sends = []
    def gl_call_hook(vm, request):
        if "EthSend" in request:
            eth_sends.append(request["EthSend"])
            return {"ok": None}
        return None
    direct_vm._gl_call_hook = gl_call_hook
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "no box and papers", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    assert order["refund_tier"] == 50
    assert order["buyer_payout"] == 500
    assert order["seller_payout"] == 500
    assert order["outcome"] == "PARTIAL_MISMATCH"
    
    assert len(eth_sends) == 2
    # Buyer payout
    assert direct_vm._to_bytes(eth_sends[0]["address"]) == direct_bob
    assert eth_sends[0]["value"] == 500
    # Seller payout
    assert direct_vm._to_bytes(eth_sends[1]["address"]) == direct_alice
    assert eth_sends[1]["value"] == 500

def test_dispute_resolved_tier_100(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Received cheap Casio watch"})
    
    llm_output = {
        "item_identity": "MISMATCH",
        "condition": "MATERIAL_MISMATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 100,
        "reason_code": "MATERIAL_MISMATCH",
        "summary": "Completely wrong item received.",
        "listing_facts": ["Vintage Rolex"],
        "evidence_facts": ["Casio watch"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    eth_sends = []
    def gl_call_hook(vm, request):
        if "EthSend" in request:
            eth_sends.append(request["EthSend"])
            return {"ok": None}
        return None
    direct_vm._gl_call_hook = gl_call_hook
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "totally wrong watch", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    assert order["refund_tier"] == 100
    assert order["buyer_payout"] == 1000
    assert order["seller_payout"] == 0
    assert order["outcome"] == "MATERIAL_MISMATCH"
    
    assert len(eth_sends) == 1
    assert direct_vm._to_bytes(eth_sends[0]["address"]) == direct_bob
    assert eth_sends[0]["value"] == 1000


def test_identity_mismatch_allows_unknown_secondary_fields(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url/rolex_v2",
            "Version B: Cheap Casio watch instead of Rolex",
            "Black Casio digital wristwatch",
        )

    direct_vm.mock_web(
        "https://evidence.url",
        {
            "status": 200,
            "body": "A vintage Rolex Submariner was delivered. No Casio watch was present.",
        },
    )
    identity_mismatch_output = {
        "item_identity": "MISMATCH",
        "condition": "UNKNOWN",
        "included_items": "UNKNOWN",
        "evidence_sufficient": True,
        "refund_tier": 100,
        "reason_code": "MATERIAL_MISMATCH",
        "summary": "A Rolex was delivered instead of the listed Casio watch.",
        "listing_facts": ["Casio digital watch"],
        "evidence_facts": ["Rolex Submariner delivered"],
    }
    direct_vm.mock_llm(r".*", json.dumps(identity_mismatch_output))

    eth_sends = []

    def gl_call_hook(vm, request):
        if "EthSend" in request:
            eth_sends.append(request["EthSend"])
            return {"ok": None}
        return None

    direct_vm._gl_call_hook = gl_call_hook

    with direct_vm.prank(direct_bob):
        contract.open_dispute(
            0,
            "A Rolex was delivered instead of the listed Casio watch",
            "https://evidence.url",
        )

    assert direct_vm.run_validator() is True

    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    assert order["refund_tier"] == 100
    assert order["buyer_payout"] == 1000
    assert order["seller_payout"] == 0
    assert order["outcome"] == "MATERIAL_MISMATCH"
    assert len(eth_sends) == 1
    assert direct_vm._to_bytes(eth_sends[0]["address"]) == direct_bob
    assert eth_sends[0]["value"] == 1000

def test_undetermined_consensus_failure(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Watch"})
    direct_vm.mock_llm(r".*", "malformed JSON")
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "broken dial", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "UNDETERMINED"
    assert order["dispute_attempts"] == 1
    assert order["buyer_payout"] == 0
    assert order["seller_payout"] == 0
    assert order["outcome"] == "UNDETERMINED"

def test_retry_limit_rejection(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Watch"})
    
    # First attempt: UNDETERMINED
    direct_vm.mock_llm(r".*", "malformed JSON")
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "broken", "https://evidence.url")
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "UNDETERMINED"
    assert order["dispute_attempts"] == 1
    
    # Second attempt: UNDETERMINED again
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "still broken", "https://evidence.url")
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "UNDETERMINED"
    assert order["dispute_attempts"] == 2
    
    # Third attempt: Rejects because cap reached
    with direct_vm.expect_revert("Max retry cap reached"):
        with direct_vm.prank(direct_bob):
            contract.open_dispute(0, "one more time", "https://evidence.url")

def test_resolved_is_terminal(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Matches"})
    
    llm_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "Matches.",
        "listing_facts": ["A"],
        "evidence_facts": ["A"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    
    with direct_vm.expect_revert("Order cannot be disputed"):
        with direct_vm.prank(direct_bob):
            contract.open_dispute(0, "reasons again", "https://evidence.url")

def test_validator_rejects_malformed_leader(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Matches"})
    direct_vm.mock_llm(r".*", "This is not JSON at all")
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    order = contract.get_order(0)
    assert order["status"] == "UNDETERMINED"

def test_validator_rejects_unsupported_tier(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
    
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Matches"})
    
    llm_output = {
        "item_identity": "MATCH",
        "condition": "PARTIAL_MISMATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 75,  # Unsupported refund tier
        "reason_code": "PARTIAL_MISMATCH",
        "summary": "75 percent refund.",
        "listing_facts": ["A"],
        "evidence_facts": ["B"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is False

def test_validator_rejects_contradictory_verdict(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
    
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Casio watch received"})
    
    llm_output = {
        "item_identity": "MISMATCH",  # Contradicts refund_tier 0
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "Totally wrong watch but 0 refund.",
        "listing_facts": ["A"],
        "evidence_facts": ["B"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is False

def test_validator_rejects_insufficient_evidence(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
    
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Empty evidence"})
    
    llm_output = {
        "item_identity": "UNKNOWN",
        "condition": "UNKNOWN",
        "included_items": "UNKNOWN",
        "evidence_sufficient": False,  # Contradicts refund_tier 50
        "refund_tier": 50,
        "reason_code": "PARTIAL_MISMATCH",
        "summary": "Insufficient evidence but 50 refund.",
        "listing_facts": ["A"],
        "evidence_facts": ["B"]
    }
    direct_vm.mock_llm(r".*", json.dumps(llm_output))
    
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is False


def test_validator_rejects_schema_valid_leader_verdict_that_independent_check_disagrees_with(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )

    direct_vm.mock_web(
        "https://evidence.url",
        {"status": 200, "body": "A cheap Casio digital watch was delivered instead of the listed Rolex."}
    )

    leader_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "The delivered item matches the listing.",
        "listing_facts": ["Rolex Submariner"],
        "evidence_facts": ["Rolex Submariner received"],
    }
    validator_output = {
        "item_identity": "MISMATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 100,
        "reason_code": "MATERIAL_MISMATCH",
        "summary": "The evidence shows a different watch model.",
        "listing_facts": ["Rolex Submariner"],
        "evidence_facts": ["Casio digital watch received"],
    }
    direct_vm.mock_llm(r".*", json.dumps(leader_output))

    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "A different watch was delivered", "https://evidence.url")

    # Direct mode captures the leader result. Replace the mocks before running
    # the validator to model an independent validator evaluation.
    direct_vm.clear_mocks()
    direct_vm.mock_web(
        "https://evidence.url",
        {"status": 200, "body": "A cheap Casio digital watch was delivered instead of the listed Rolex."}
    )
    direct_vm.mock_llm(r".*", json.dumps(validator_output))

    assert direct_vm.run_validator() is False


def test_validator_accepts_matching_decision_fields_with_different_summary_text(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url/rolex_v1",
            "Version A: Rolex watch including original box and papers",
            "Vintage Watch"
        )

    direct_vm.mock_web(
        "https://evidence.url",
        {"status": 200, "body": "The Rolex arrived without its original box and papers."}
    )

    leader_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "PARTIAL_MISMATCH",
        "evidence_sufficient": True,
        "refund_tier": 50,
        "reason_code": "PARTIAL_MISMATCH",
        "summary": "The listed accessories are missing.",
        "listing_facts": ["Original box and papers included"],
        "evidence_facts": ["Box and papers not delivered"],
    }
    validator_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "PARTIAL_MISMATCH",
        "evidence_sufficient": True,
        "refund_tier": 50,
        "reason_code": "PARTIAL_MISMATCH",
        "summary": "A partial refund is justified because key accessories are absent.",
        "listing_facts": ["Listing promises accessories"],
        "evidence_facts": ["Evidence reports missing accessories"],
    }
    direct_vm.mock_llm(r".*", json.dumps(leader_output))
    direct_vm._gl_call_hook = lambda _vm, request: {"ok": None} if "EthSend" in request else None

    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "The accessories are missing", "https://evidence.url")

    direct_vm.clear_mocks()
    direct_vm.mock_web(
        "https://evidence.url",
        {"status": 200, "body": "The Rolex arrived without its original box and papers."}
    )
    direct_vm.mock_llm(r".*", json.dumps(validator_output))

    assert direct_vm.run_validator() is True
    assert contract.get_order(0)["refund_tier"] == 50

def test_listing_snapshot_immutability(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    # 1. Order is created from listing snapshot Version A
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url/rolex_v1",
            "Version A: Rolex watch including original box and papers",
            "Vintage Watch"
        )
        
    # Mock some web and LLM
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "Rolex watch received with papers but missing box"})
    
    # We update the mock LLM prompt check to assert it received Version A snapshot (untrusted)
    # even if external context could pretend to be Version B
    llm_output = {
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "PARTIAL_MISMATCH",
        "evidence_sufficient": True,
        "refund_tier": 50,
        "reason_code": "PARTIAL_MISMATCH",
        "summary": "Missing box.",
        "listing_facts": ["Original box and papers included"],
        "evidence_facts": ["Original papers present, box missing"]
    }
    
    # Capture prompt to verify it contains Version A snapshot
    captured_prompts = []
    def mock_llm_handler(prompt_data):
        prompt = prompt_data.get("prompt", "")
        captured_prompts.append(prompt)
        return {"ok": llm_output}
    direct_vm._live_llm_handler = mock_llm_handler
    
    # 2. Open dispute
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "missing box", "https://evidence.url")
        
    # 3. Dispute evaluation executes
    assert direct_vm.run_validator() is True
    
    # 4. Verify evaluation used Version A snapshot
    assert len(captured_prompts) == 2
    for prompt in captured_prompts:
        assert "Version A: Rolex watch" in prompt
        assert "Version B:" not in prompt

def test_missing_evidence(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_dispute.py")
    
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch"
        )
        
    with direct_vm.expect_revert("At least one evidence URL is required"):
        with direct_vm.prank(direct_bob):
            contract.open_dispute(0, "reasons", "")


def test_create_order_records_deadline_and_rejects_invalid_timeout(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    direct_vm.warp("2026-08-08T00:00:00Z")
    contract = direct_deploy("contracts/gen_dispute.py")

    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        order_id = contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Timed order",
            120,
        )

    expected_created_at = int(datetime(2026, 8, 8, tzinfo=timezone.utc).timestamp())
    order = contract.get_order(order_id)
    assert order["created_at"] == expected_created_at
    assert order["expires_at"] == expected_created_at + 120

    for invalid_timeout in [59, 30 * 24 * 60 * 60 + 1]:
        with direct_vm.expect_revert("Timeout must be between 60 and 2592000 seconds"):
            with direct_vm.prank(direct_alice):
                direct_vm.value = 1000
                contract.create_order(
                    direct_bob,
                    "https://listing.url",
                    "Vintage Rolex Submariner watch in excellent condition",
                    "Invalid timeout",
                    invalid_timeout,
                )


def test_evidence_bytes_are_hashed_and_committed_on_chain(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch",
        )

    evidence_body = "The delivered Rolex matches the listing exactly."
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": evidence_body})
    direct_vm.mock_llm(r".*", json.dumps({
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "The item matches.",
        "listing_facts": ["Rolex listed"],
        "evidence_facts": ["Rolex received"],
    }))
    direct_vm._gl_call_hook = lambda _vm, request: {"ok": None} if "EthSend" in request else None

    reason = "Confirm that the received watch matches"
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, reason, "https://evidence.url")
    assert direct_vm.run_validator() is True

    expected_evidence_hash = hashlib.sha256(evidence_body.encode("utf-8")).hexdigest()
    expected_commitment = hashlib.sha256(json.dumps(
        {
            "evidence_sha256_1": expected_evidence_hash,
            "evidence_sha256_2": "",
            "evidence_url_1": "https://evidence.url",
            "evidence_url_2": "",
            "order_id": 0,
            "reason": reason,
            "submission_number": 1,
            "version": "GENDISPUTE_EVIDENCE_V1",
        },
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")).hexdigest()

    order = contract.get_order(0)
    assert order["evidence_hashes"] == [expected_evidence_hash]
    assert order["evidence_commitments"] == [expected_commitment]


def test_validator_rejects_changed_evidence_bytes_even_when_verdict_matches(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch",
        )

    verdict = json.dumps({
        "item_identity": "MATCH",
        "condition": "MATCH",
        "included_items": "MATCH",
        "evidence_sufficient": True,
        "refund_tier": 0,
        "reason_code": "MATCHES_DESCRIPTION",
        "summary": "The item matches.",
        "listing_facts": ["Rolex listed"],
        "evidence_facts": ["Rolex received"],
    })
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "leader bytes"})
    direct_vm.mock_llm(r".*", verdict)
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "Verify the item", "https://evidence.url")

    direct_vm.clear_mocks()
    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "changed validator bytes"})
    direct_vm.mock_llm(r".*", verdict)
    assert direct_vm.run_validator() is False


def test_retry_preserves_each_evidence_commitment(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch",
        )

    direct_vm.mock_web("https://evidence.url/one", {"status": 200, "body": "attempt one"})
    direct_vm.mock_llm(r".*", "malformed JSON")
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "First attempt", "https://evidence.url/one")
    assert direct_vm.run_validator() is True
    first_commitment = contract.get_order(0)["evidence_commitments"][0]

    direct_vm.clear_mocks()
    direct_vm.mock_web("https://evidence.url/two", {"status": 200, "body": "attempt two"})
    direct_vm.mock_llm(r".*", "malformed JSON")
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "Second attempt", "https://evidence.url/two")
    assert direct_vm.run_validator() is True

    commitments = contract.get_order(0)["evidence_commitments"]
    assert len(commitments) == 2
    assert commitments[0] == first_commitment
    assert commitments[1] != first_commitment


def test_buyer_can_confirm_delivery_and_release_full_escrow(
    direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy("contracts/gen_dispute.py")
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Vintage Watch",
        )

    with direct_vm.expect_revert("Only buyer can confirm delivery"):
        with direct_vm.prank(direct_charlie):
            contract.confirm_delivery(0)

    eth_sends = []
    def gl_call_hook(_vm, request):
        if "EthSend" in request:
            eth_sends.append(request["EthSend"])
            return {"ok": None}
        return None
    direct_vm._gl_call_hook = gl_call_hook

    with direct_vm.prank(direct_bob):
        contract.confirm_delivery(0)

    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    assert order["outcome"] == "BUYER_CONFIRMED"
    assert order["buyer_payout"] == 0
    assert order["seller_payout"] == 1000
    assert len(eth_sends) == 1
    assert direct_vm._to_bytes(eth_sends[0]["address"]) == direct_alice

    with direct_vm.expect_revert("Order cannot be confirmed"):
        with direct_vm.prank(direct_bob):
            contract.confirm_delivery(0)


def test_expired_order_recovery_is_permissioned_and_cannot_run_early(
    direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
):
    direct_vm.warp("2026-08-08T00:00:00Z")
    contract = direct_deploy("contracts/gen_dispute.py")
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Timed order",
            60,
        )

    with direct_vm.expect_revert("Only buyer or seller can recover an expired order"):
        with direct_vm.prank(direct_charlie):
            contract.recover_expired_order(0)
    with direct_vm.expect_revert("Order has not expired"):
        with direct_vm.prank(direct_alice):
            contract.recover_expired_order(0)

    direct_vm.warp("2026-08-08T00:01:00Z")
    with direct_vm.expect_revert("Order dispute window has expired"):
        with direct_vm.prank(direct_bob):
            contract.open_dispute(0, "Too late", "https://evidence.url")

    eth_sends = []
    def gl_call_hook(_vm, request):
        if "EthSend" in request:
            eth_sends.append(request["EthSend"])
            return {"ok": None}
        return None
    direct_vm._gl_call_hook = gl_call_hook

    with direct_vm.prank(direct_bob):
        contract.recover_expired_order(0)

    order = contract.get_order(0)
    assert order["status"] == "PAID_OUT"
    assert order["outcome"] == "EXPIRED_RECOVERY"
    assert order["seller_payout"] == 1000
    assert len(eth_sends) == 1
    assert direct_vm._to_bytes(eth_sends[0]["address"]) == direct_alice

    with direct_vm.expect_revert("Order cannot be recovered"):
        with direct_vm.prank(direct_alice):
            contract.recover_expired_order(0)


def test_expired_undetermined_order_can_be_recovered(
    direct_deploy, direct_vm, direct_alice, direct_bob
):
    direct_vm.warp("2026-08-08T00:00:00Z")
    contract = direct_deploy("contracts/gen_dispute.py")
    with direct_vm.prank(direct_alice):
        direct_vm.value = 1000
        contract.create_order(
            direct_bob,
            "https://listing.url",
            "Vintage Rolex Submariner watch in excellent condition",
            "Timed order",
            60,
        )

    direct_vm.mock_web("https://evidence.url", {"status": 200, "body": "unclear"})
    direct_vm.mock_llm(r".*", "malformed JSON")
    with direct_vm.prank(direct_bob):
        contract.open_dispute(0, "Unclear evidence", "https://evidence.url")
    assert direct_vm.run_validator() is True
    assert contract.get_order(0)["status"] == "UNDETERMINED"

    direct_vm.warp("2026-08-08T00:01:00Z")
    direct_vm._gl_call_hook = lambda _vm, request: {"ok": None} if "EthSend" in request else None
    with direct_vm.prank(direct_alice):
        contract.recover_expired_order(0)
    assert contract.get_order(0)["outcome"] == "EXPIRED_RECOVERY"


def test_root_slot_upgrade_is_restricted_to_deployer(
    direct_deploy, direct_vm, direct_bob
):
    contract = direct_deploy("contracts/gen_dispute.py")
    deployer = direct_vm.sender
    assert contract.get_upgrader() == deployer

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Unauthorized address"):
            contract.upgrade(b"malicious code")

    with direct_vm.expect_revert("Upgrade code cannot be empty"):
        contract.upgrade(b"")

    contract.upgrade(b"replacement code")


def test_public_evidence_fixtures_match_contract_listing():
    project_root = Path(__file__).resolve().parents[1]
    fixture_names = [
        "fixture_listing.html",
        "fixture_evidence_match.html",
        "fixture_evidence_partial.html",
        "fixture_evidence_full_mismatch.html",
        "fixture_prompt_injection.html",
        "fixture_evidence_casio_match.html",
        "fixture_evidence_casio_partial.html",
        "fixture_evidence_rolex_instead_of_casio.html",
        "fixture_prompt_injection_casio.html",
    ]

    root_fixtures = project_root / "fixtures"
    public_fixtures = project_root / "frontend" / "public" / "fixtures"

    for fixture_name in fixture_names:
        source = (root_fixtures / fixture_name).read_text(encoding="utf-8")
        public = (public_fixtures / fixture_name).read_text(encoding="utf-8")

        assert source == public
        assert "Omega" not in source
        assert "Seamaster" not in source

    match_evidence = (root_fixtures / "fixture_evidence_match.html").read_text(
        encoding="utf-8"
    )
    partial_evidence = (root_fixtures / "fixture_evidence_partial.html").read_text(
        encoding="utf-8"
    )
    mismatch_evidence = (
        root_fixtures / "fixture_evidence_full_mismatch.html"
    ).read_text(encoding="utf-8")

    assert "Rolex Submariner" in match_evidence
    assert "Rolex Submariner" in partial_evidence
    assert "Rolex Submariner" in mismatch_evidence
    assert "Casio digital watch" in mismatch_evidence

    casio_match = (root_fixtures / "fixture_evidence_casio_match.html").read_text(
        encoding="utf-8"
    )
    casio_partial = (
        root_fixtures / "fixture_evidence_casio_partial.html"
    ).read_text(encoding="utf-8")
    rolex_for_casio = (
        root_fixtures / "fixture_evidence_rolex_instead_of_casio.html"
    ).read_text(encoding="utf-8")

    assert "Casio digital wristwatch" in casio_match
    assert "minor cosmetic strap scratches" in casio_partial
    assert "No Casio digital watch was delivered" in rolex_for_casio
    assert "matching the listing" not in casio_match.lower()
    assert "matching the listing" not in rolex_for_casio.lower()
