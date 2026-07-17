import pytest
import json
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
        
    order = contract.get_order()
    assert order["status"] == "OPEN"
    assert order["seller"] == direct_alice
    assert order["buyer"] == direct_bob
    assert order["escrow_amount"] == 1000
    assert order["listing_url"] == "https://listing.url"
    assert order["listing_snapshot"] == "Vintage Rolex Submariner watch in excellent condition"
    assert order["item_description"] == "Test Item"

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
            contract.open_dispute("reasons", "https://evidence.url")

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
        contract.open_dispute("item matches description", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
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
        contract.open_dispute("no box and papers", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
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
        contract.open_dispute("totally wrong watch", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
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
        contract.open_dispute("broken dial", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
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
        contract.open_dispute("broken", "https://evidence.url")
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
    assert order["status"] == "UNDETERMINED"
    assert order["dispute_attempts"] == 1
    
    # Second attempt: UNDETERMINED again
    with direct_vm.prank(direct_bob):
        contract.open_dispute("still broken", "https://evidence.url")
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
    assert order["status"] == "UNDETERMINED"
    assert order["dispute_attempts"] == 2
    
    # Third attempt: Rejects because cap reached
    with direct_vm.expect_revert("Max retry cap reached"):
        with direct_vm.prank(direct_bob):
            contract.open_dispute("one more time", "https://evidence.url")

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
        contract.open_dispute("reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    
    order = contract.get_order()
    assert order["status"] == "PAID_OUT"
    
    with direct_vm.expect_revert("Order cannot be disputed"):
        with direct_vm.prank(direct_bob):
            contract.open_dispute("reasons again", "https://evidence.url")

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
        contract.open_dispute("reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is True
    order = contract.get_order()
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
        contract.open_dispute("reasons", "https://evidence.url")
        
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
        contract.open_dispute("reasons", "https://evidence.url")
        
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
        contract.open_dispute("reasons", "https://evidence.url")
        
    assert direct_vm.run_validator() is False

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
        return json.dumps(llm_output)
    direct_vm._live_llm_handler = mock_llm_handler
    
    # 2. Open dispute
    with direct_vm.prank(direct_bob):
        contract.open_dispute("missing box", "https://evidence.url")
        
    # 3. Dispute evaluation executes
    assert direct_vm.run_validator() is True
    
    # 4. Verify evaluation used Version A snapshot
    assert len(captured_prompts) == 1
    assert "Version A: Rolex watch" in captured_prompts[0]
    assert "Version B:" not in captured_prompts[0]

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
            contract.open_dispute("reasons", "")


def test_public_evidence_fixtures_match_contract_listing():
    project_root = Path(__file__).resolve().parents[1]
    fixture_names = [
        "fixture_listing.html",
        "fixture_evidence_match.html",
        "fixture_evidence_partial.html",
        "fixture_evidence_full_mismatch.html",
        "fixture_prompt_injection.html",
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
