// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockSwapRouter
 * @notice A simple mock swap router for Coston2 testnet demos
 * @dev Swaps tokens at a fixed rate - for hackathon demo purposes only!
 *      In production, use BlazeSwap or another real DEX.
 */
contract MockSwapRouter is Ownable {
    using SafeERC20 for IERC20;

    // Fixed rate: 1 FXRP = 0.50 USDT (both have 6 decimals)
    // Rate is stored as basis points (5000 = 50%)
    uint256 public swapRateBps = 5000;

    event SwapExecuted(
        address indexed sender,
        address[] path,
        uint256 amountIn,
        uint256 amountOut
    );

    event RateUpdated(uint256 newRateBps);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Get expected output amounts for a swap
     * @param amountIn Input token amount
     * @param path Array of token addresses [tokenIn, tokenOut]
     * @return amounts Array of amounts [amountIn, amountOut]
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        // Apply fixed rate for each hop
        uint256 currentAmount = amountIn;
        for (uint256 i = 1; i < path.length; i++) {
            currentAmount = (currentAmount * swapRateBps) / 10000;
            amounts[i] = currentAmount;
        }
    }

    /**
     * @notice Swap exact tokens for tokens (UniswapV2 compatible interface)
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum output tokens (slippage protection)
     * @param path Array of token addresses [tokenIn, tokenOut]
     * @param to Recipient address
     * @param deadline Transaction deadline (unused in mock)
     * @return amounts Array of amounts [amountIn, amountOut]
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        require(block.timestamp <= deadline, "Expired");

        // Calculate output
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        uint256 currentAmount = amountIn;
        for (uint256 i = 1; i < path.length; i++) {
            currentAmount = (currentAmount * swapRateBps) / 10000;
            amounts[i] = currentAmount;
        }

        uint256 amountOut = amounts[path.length - 1];
        require(amountOut >= amountOutMin, "Insufficient output");

        // Transfer tokens
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];

        // Pull input tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Send output tokens to recipient
        // Note: This contract must hold enough output tokens!
        IERC20(tokenOut).safeTransfer(to, amountOut);

        emit SwapExecuted(msg.sender, path, amountIn, amountOut);
    }

    /**
     * @notice Update the swap rate (owner only)
     * @param newRateBps New rate in basis points (10000 = 100%)
     */
    function setSwapRate(uint256 newRateBps) external onlyOwner {
        require(newRateBps <= 20000, "Rate too high"); // Max 200%
        swapRateBps = newRateBps;
        emit RateUpdated(newRateBps);
    }

    /**
     * @notice Deposit tokens for liquidity (owner only)
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositLiquidity(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraw tokens (owner only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdrawLiquidity(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Get token balance held by this contract
     * @param token Token address
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
