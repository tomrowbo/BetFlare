// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Vault
 * @notice ERC4626 vault for LP deposits and fee distribution
 * @dev LPs deposit USDT and earn fees from FPMM trading
 */
contract Vault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    uint256 public totalFees;
    mapping(address => bool) public authorizedMarkets;

    event FeesReceived(address indexed from, uint256 amount);
    event MarketAuthorized(address indexed market, bool authorized);
    event LiquidityProvided(address indexed market, uint256 amount);

    constructor(
        IERC20 _asset
    ) ERC4626(_asset) ERC20("FlarePredict LP", "fpLP") Ownable(msg.sender) {}

    /**
     * @notice Authorize a market to send fees
     */
    function authorizeMarket(address market, bool authorized) external onlyOwner {
        authorizedMarkets[market] = authorized;
        emit MarketAuthorized(market, authorized);
    }

    /**
     * @notice Receive fees from an FPMM market
     * @dev Called by authorized FPMM contracts when fees are collected
     */
    function receiveFees(uint256 amount) external {
        require(authorizedMarkets[msg.sender], "Not authorized");
        totalFees += amount;
        emit FeesReceived(msg.sender, amount);
    }

    /**
     * @notice Provide liquidity from vault to a market
     * @param market The FPMM market to provide liquidity to
     * @param amount Amount of collateral to provide
     */
    function provideLiquidityToMarket(address market, uint256 amount) external onlyOwner {
        require(authorizedMarkets[market], "Not authorized market");
        require(amount <= totalAssets(), "Insufficient assets");

        IERC20(asset()).approve(market, amount);

        // The market's addLiquidity function will be called manually
        // This just approves the transfer
        emit LiquidityProvided(market, amount);
    }

    /**
     * @notice Total assets = deposits + accumulated fees
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /**
     * @notice Preview deposit with no fees
     */
    function previewDeposit(uint256 assets) public view override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /**
     * @notice Preview withdraw with no fees
     */
    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    /**
     * @notice Get APY based on fees earned (simplified)
     * @return APY in basis points (e.g., 500 = 5%)
     */
    function getApyBps() external view returns (uint256) {
        uint256 assets = totalAssets();
        if (assets == 0) return 0;
        // Simplified: assumes fees accumulated over some period
        // In production, would track time-weighted returns
        return (totalFees * 10000) / assets;
    }
}
