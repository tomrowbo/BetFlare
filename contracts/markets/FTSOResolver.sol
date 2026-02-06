// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IFtsoRegistry.sol";
import "../core/ConditionalTokens.sol";
import "../core/FPMM.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FTSOResolver
 * @notice Resolves prediction markets using Flare FTSO price feeds
 */
contract FTSOResolver is Ownable {
    IFtsoRegistry public ftsoRegistry;
    ConditionalTokens public conditionalTokens;

    struct Market {
        bytes32 questionId;
        bytes32 conditionId;
        string symbol;          // e.g., "XRP"
        uint256 targetPrice;    // Target price with 5 decimals (FTSO standard)
        uint256 resolutionTime; // Unix timestamp
        bool isAbove;           // true = "will be above", false = "will be below"
        bool resolved;
        address fpmm;
    }

    mapping(bytes32 => Market) public markets;
    bytes32[] public marketIds;

    event MarketCreated(
        bytes32 indexed marketId,
        string symbol,
        uint256 targetPrice,
        uint256 resolutionTime,
        bool isAbove
    );

    event MarketResolved(
        bytes32 indexed marketId,
        uint256 actualPrice,
        bool yesWins
    );

    // Flare Coston2 FTSO Registry: 0xE80EBb4D949Bb15a78d1209B84c9B10C4Cd3bD0f
    constructor(
        address _ftsoRegistry,
        address _conditionalTokens
    ) Ownable(msg.sender) {
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        conditionalTokens = ConditionalTokens(_conditionalTokens);
    }

    /**
     * @notice Create a new price prediction market
     * @param symbol The FTSO symbol (e.g., "XRP", "FLR", "BTC")
     * @param targetPrice Target price (5 decimals, e.g., 300000 = $3.00)
     * @param resolutionTime Unix timestamp when market resolves
     * @param isAbove true if betting price will be above target
     * @param fpmm Address of the FPMM for this market
     */
    function createMarket(
        string calldata symbol,
        uint256 targetPrice,
        uint256 resolutionTime,
        bool isAbove,
        address fpmm
    ) external onlyOwner returns (bytes32 marketId) {
        require(resolutionTime > block.timestamp, "Resolution must be future");
        require(fpmm != address(0), "Invalid FPMM");

        // Create unique question ID
        bytes32 questionId = keccak256(
            abi.encodePacked(symbol, targetPrice, resolutionTime, isAbove, block.timestamp)
        );

        // Prepare condition in ConditionalTokens
        conditionalTokens.prepareCondition(address(this), questionId, 2);

        bytes32 conditionId = conditionalTokens.getConditionId(address(this), questionId, 2);
        marketId = keccak256(abi.encodePacked(conditionId, fpmm));

        markets[marketId] = Market({
            questionId: questionId,
            conditionId: conditionId,
            symbol: symbol,
            targetPrice: targetPrice,
            resolutionTime: resolutionTime,
            isAbove: isAbove,
            resolved: false,
            fpmm: fpmm
        });

        marketIds.push(marketId);

        emit MarketCreated(marketId, symbol, targetPrice, resolutionTime, isAbove);
    }

    /**
     * @notice Resolve a market using FTSO price
     * @param marketId The market to resolve
     */
    function resolve(bytes32 marketId) external {
        Market storage market = markets[marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.resolutionTime, "Too early");

        // Get current price from FTSO
        (uint256 price, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals(market.symbol);

        // Normalize price to 5 decimals if needed
        uint256 normalizedPrice = price;
        if (decimals > 5) {
            normalizedPrice = price / (10 ** (decimals - 5));
        } else if (decimals < 5) {
            normalizedPrice = price * (10 ** (5 - decimals));
        }

        // Determine outcome
        bool yesWins;
        if (market.isAbove) {
            yesWins = normalizedPrice > market.targetPrice;
        } else {
            yesWins = normalizedPrice < market.targetPrice;
        }

        // Report payouts: [YES_payout, NO_payout]
        uint256[] memory payouts = new uint256[](2);
        if (yesWins) {
            payouts[0] = 1;
            payouts[1] = 0;
        } else {
            payouts[0] = 0;
            payouts[1] = 1;
        }

        conditionalTokens.reportPayouts(market.questionId, payouts);
        market.resolved = true;

        // Mark FPMM as resolved
        if (market.fpmm != address(0)) {
            FPMM(market.fpmm).markResolved();
        }

        emit MarketResolved(marketId, normalizedPrice, yesWins);
    }

    /**
     * @notice Get current FTSO price for a symbol
     */
    function getCurrentPrice(string calldata symbol) external view returns (uint256 price, uint256 timestamp) {
        (price, timestamp) = ftsoRegistry.getCurrentPrice(symbol);
    }

    /**
     * @notice Get market details
     */
    function getMarket(bytes32 marketId) external view returns (
        string memory symbol,
        uint256 targetPrice,
        uint256 resolutionTime,
        bool isAbove,
        bool resolved,
        bytes32 conditionId
    ) {
        Market storage m = markets[marketId];
        return (m.symbol, m.targetPrice, m.resolutionTime, m.isAbove, m.resolved, m.conditionId);
    }

    /**
     * @notice Get all market IDs
     */
    function getAllMarketIds() external view returns (bytes32[] memory) {
        return marketIds;
    }

    /**
     * @notice Get number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }
}
