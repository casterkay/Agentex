// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DemoTradeVenue {
    event TradeExecuted(
        address indexed seller,
        bytes32 indexed tradeId,
        string pair,
        bool isBuy,
        uint256 size,
        uint256 fillPrice,
        uint256 executionTimestamp
    );

    function executeTrade(
        string calldata pair,
        bool isBuy,
        uint256 size,
        uint256 fillPrice
    ) external returns (bytes32 tradeId) {
        tradeId = keccak256(
            abi.encode(block.chainid, address(this), msg.sender, pair, isBuy, size, fillPrice, block.number, block.timestamp)
        );
        emit TradeExecuted(msg.sender, tradeId, pair, isBuy, size, fillPrice, block.timestamp);
    }
}
