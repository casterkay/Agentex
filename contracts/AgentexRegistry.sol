// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC721Owner {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract AgentexRegistry {
    struct Attestation {
        address sellerRegistry;
        uint256 sellerAgentId;
        bytes32 experienceId;
        bytes32 tradeTxHash;
        bytes32 venueId;
        string pair;
        bool isBuy;
        uint256 size;
        uint256 fillPrice;
        uint256 actualFillPrice;
        bytes32 encryptedExperienceCidHash;
        bytes32 decryptedExperienceHash;
        bytes32 executionProofHash;
        uint256 attestationDeadline;
        bytes sellerSignature;
        bytes decoderSignature;
    }

    event AttestationAccepted(bytes32 indexed attestationId, bytes32 indexed experienceId, bytes32 indexed tradeTxHash);

    mapping(bytes32 => address) public whitelistedVenues;
    mapping(bytes32 => uint256) public venueToleranceBps;
    mapping(bytes32 => mapping(address => bool)) public authorizedDecoders;
    mapping(bytes32 => bool) public acceptedAttestations;
    mapping(bytes32 => bool) public sellerTradeUsed;

    function whitelistVenue(bytes32 venueId, address venue, uint256 toleranceBps) external {
        whitelistedVenues[venueId] = venue;
        venueToleranceBps[venueId] = toleranceBps;
    }

    function setDecoder(bytes32 venueId, address decoder, bool authorized) external {
        authorizedDecoders[venueId][decoder] = authorized;
    }

    function submitAttestation(Attestation calldata attestation) external returns (bytes32 attestationId) {
        require(whitelistedVenues[attestation.venueId] != address(0), "venue not whitelisted");
        require(block.timestamp <= attestation.attestationDeadline, "attestation expired");
        address owner = IERC721Owner(attestation.sellerRegistry).ownerOf(attestation.sellerAgentId);
        bytes32 sellerDigest = keccak256(abi.encode(attestation.sellerRegistry, attestation.sellerAgentId, attestation.tradeTxHash, attestation.encryptedExperienceCidHash, attestation.decryptedExperienceHash));
        require(recover(sellerDigest, attestation.sellerSignature) == owner, "bad seller signature");
        address decoder = recover(attestation.executionProofHash, attestation.decoderSignature);
        require(authorizedDecoders[attestation.venueId][decoder], "bad decoder");
        require(fillClose(attestation.fillPrice, attestation.actualFillPrice, venueToleranceBps[attestation.venueId]), "fill price outside tolerance");

        bytes32 sellerTradeKey = keccak256(abi.encode(attestation.sellerRegistry, attestation.sellerAgentId, attestation.tradeTxHash));
        require(!sellerTradeUsed[sellerTradeKey], "seller trade already used");

        attestationId = keccak256(abi.encode(attestation));
        acceptedAttestations[attestationId] = true;
        sellerTradeUsed[sellerTradeKey] = true;
        emit AttestationAccepted(attestationId, attestation.experienceId, attestation.tradeTxHash);
    }

    function isAccepted(bytes32 attestationId) external view returns (bool) {
        return acceptedAttestations[attestationId];
    }

    function fillClose(uint256 expected, uint256 actual, uint256 toleranceBps) internal pure returns (bool) {
        if (actual == 0) return false;
        uint256 diff = expected > actual ? expected - actual : actual - expected;
        return diff * 10_000 <= actual * toleranceBps;
    }

    function recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(toEthSignedMessageHash(digest), v, r, s);
    }

    function toEthSignedMessageHash(bytes32 digest) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    }
}
