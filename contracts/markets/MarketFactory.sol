// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/ConditionalTokens.sol";
import "../core/FPMM.sol";
import "../core/Vault.sol";
import "./FTSOResolver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MarketFactory
 * @notice Factory for creating XRP price prediction markets
 */
contract MarketFactory is Ownable {
    using SafeERC20 for IERC20;

    ConditionalTokens public conditionalTokens;
    FTSOResolver public resolver;
    Vault public vault;
    IERC20 public collateralToken;

    FPMM[] public markets;

    event MarketCreated(
        address indexed fpmm,
        bytes32 indexed marketId,
        string symbol,
        uint256 targetPrice,
        uint256 resolutionTime,
        bool isAbove,
        uint256 initialLiquidity
    );

    constructor(
        address _conditionalTokens,
        address _resolver,
        address _vault,
        address _collateralToken
    ) Ownable(msg.sender) {
        conditionalTokens = ConditionalTokens(_conditionalTokens);
        resolver = FTSOResolver(_resolver);
        vault = Vault(_vault);
        collateralToken = IERC20(_collateralToken);
    }

    /**
     * @notice Create a new XRP price prediction market
     * @param targetPrice Target price in 5 decimals (e.g., 300000 = $3.00)
     * @param resolutionTime Unix timestamp for resolution
     * @param isAbove true = "XRP above target", false = "XRP below target"
     * @param initialLiquidity Amount of USDT for initial liquidity
     */
    function createXRPMarket(
        uint256 targetPrice,
        uint256 resolutionTime,
        bool isAbove,
        uint256 initialLiquidity
    ) external returns (address fpmmAddress, bytes32 marketId) {
        require(initialLiquidity > 0, "Need initial liquidity");
        require(resolutionTime > block.timestamp, "Resolution must be future");

        // Create FPMM (we'll set the condition after resolver creates it)
        // First, create a placeholder condition ID
        bytes32 questionId = keccak256(
            abi.encodePacked("XRP", targetPrice, resolutionTime, isAbove, block.timestamp)
        );

        // Prepare condition
        conditionalTokens.prepareCondition(address(resolver), questionId, 2);
        bytes32 conditionId = conditionalTokens.getConditionId(address(resolver), questionId, 2);

        // Deploy FPMM
        FPMM fpmm = new FPMM(
            address(conditionalTokens),
            address(collateralToken),
            conditionId,
            address(vault)
        );

        fpmmAddress = address(fpmm);
        markets.push(fpmm);

        // Authorize market in vault
        vault.authorizeMarket(fpmmAddress, true);

        // Transfer initial liquidity and add to market
        collateralToken.safeTransferFrom(msg.sender, address(this), initialLiquidity);
        collateralToken.approve(fpmmAddress, initialLiquidity);
        fpmm.addLiquidity(initialLiquidity);

        // Create market in resolver (for resolution tracking)
        marketId = keccak256(abi.encodePacked(conditionId, fpmmAddress));

        emit MarketCreated(
            fpmmAddress,
            marketId,
            "XRP",
            targetPrice,
            resolutionTime,
            isAbove,
            initialLiquidity
        );
    }

    /**
     * @notice Get all deployed markets
     */
    function getAllMarkets() external view returns (FPMM[] memory) {
        return markets;
    }

    /**
     * @notice Get market count
     */
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }
}
