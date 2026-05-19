// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ExperienceAccessObligation {
    struct FulfillmentData {
        string attestationId;
        string encryptedExperienceCid;
        bytes32 decryptedExperienceHash;
        bytes32 keyEnvelopeHash;
        bytes32 deliveryProofHash;
    }

    event ExperienceAccessFulfilled(
        bytes32 indexed fulfillmentUid,
        bytes32 indexed escrowUid,
        address indexed fulfiller,
        string attestationId,
        string encryptedExperienceCid,
        bytes32 decryptedExperienceHash,
        bytes32 keyEnvelopeHash,
        bytes32 deliveryProofHash
    );

    mapping(bytes32 fulfillmentUid => FulfillmentData data) private fulfillments;

    function fulfill(
        FulfillmentData calldata data,
        bytes32 escrowUid
    ) external returns (bytes32 fulfillmentUid) {
        require(escrowUid != bytes32(0), "missing escrow");
        require(bytes(data.attestationId).length != 0, "missing attestation");
        require(bytes(data.encryptedExperienceCid).length != 0, "missing cid");
        require(data.decryptedExperienceHash != bytes32(0), "missing hash");
        require(data.keyEnvelopeHash != bytes32(0), "missing key envelope");
        require(data.deliveryProofHash != bytes32(0), "missing delivery proof");

        fulfillmentUid = keccak256(abi.encode(block.chainid, address(this), msg.sender, escrowUid, data));
        require(bytes(fulfillments[fulfillmentUid].attestationId).length == 0, "duplicate fulfillment");

        fulfillments[fulfillmentUid] = data;
        emit ExperienceAccessFulfilled(
            fulfillmentUid,
            escrowUid,
            msg.sender,
            data.attestationId,
            data.encryptedExperienceCid,
            data.decryptedExperienceHash,
            data.keyEnvelopeHash,
            data.deliveryProofHash
        );
    }

    function getFulfillmentData(bytes32 fulfillmentUid) external view returns (FulfillmentData memory) {
        FulfillmentData memory data = fulfillments[fulfillmentUid];
        require(bytes(data.attestationId).length != 0, "unknown fulfillment");
        return data;
    }
}
