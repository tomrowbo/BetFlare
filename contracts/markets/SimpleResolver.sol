// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/ConditionalTokens.sol";
import "../core/FPMM.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory _symbol)
        external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals);
}

/**
 * @title SimpleResolver
 * @notice Simple resolver that can fetch FTSO prices and resolve markets
 */
contract SimpleResolver is Ownable {
    IFtsoRegistry public ftsoRegistry;
    ConditionalTokens public conditionalTokens;

    constructor(address _ftsoRegistry, address _conditionalTokens) Ownable(msg.sender) {
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        conditionalTokens = ConditionalTokens(_conditionalTokens);
    }

    /**
     * @notice Prepare a condition for a market
     */
    function prepareCondition(bytes32 questionId) external onlyOwner returns (bytes32) {
        conditionalTokens.prepareCondition(address(this), questionId, 2);
        return conditionalTokens.getConditionId(address(this), questionId, 2);
    }

    /**
     * @notice Get current price from FTSO
     */
    function getCurrentPrice(string calldata symbol) external view returns (uint256 price, uint256 decimals) {
        (price, , decimals) = ftsoRegistry.getCurrentPriceWithDecimals(symbol);
    }

    /**
     * @notice Resolve a market - YES wins
     */
    function resolveYes(bytes32 questionId, address fpmm) external onlyOwner {
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        payouts[1] = 0;
        conditionalTokens.reportPayouts(questionId, payouts);
        if (fpmm != address(0)) {
            FPMM(fpmm).markResolved();
        }
    }

    /**
     * @notice Resolve a market - NO wins
     */
    function resolveNo(bytes32 questionId, address fpmm) external onlyOwner {
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 0;
        payouts[1] = 1;
        conditionalTokens.reportPayouts(questionId, payouts);
        if (fpmm != address(0)) {
            FPMM(fpmm).markResolved();
        }
    }

    /**
     * @notice Resolve based on FTSO price
     */
    function resolveWithFTSO(
        bytes32 questionId,
        address fpmm,
        string calldata symbol,
        uint256 targetPrice, // in 5 decimals
        bool isAbove
    ) external onlyOwner {
        (uint256 price, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals(symbol);

        // Normalize to 5 decimals
        uint256 normalizedPrice = price;
        if (decimals > 5) {
            normalizedPrice = price / (10 ** (decimals - 5));
        } else if (decimals < 5) {
            normalizedPrice = price * (10 ** (5 - decimals));
        }

        bool yesWins = isAbove ? (normalizedPrice > targetPrice) : (normalizedPrice < targetPrice);

        uint256[] memory payouts = new uint256[](2);
        if (yesWins) {
            payouts[0] = 1;
            payouts[1] = 0;
        } else {
            payouts[0] = 0;
            payouts[1] = 1;
        }

        conditionalTokens.reportPayouts(questionId, payouts);
        if (fpmm != address(0)) {
            FPMM(fpmm).markResolved();
        }
    }
}
