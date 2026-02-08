// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBlazeSwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
}

/**
 * @title SwapAndDepositWrapper
 * @notice Wrapper contract for Flare Smart Accounts custom instructions
 * @dev Allows a single registered instruction to work for ALL users by using msg.sender
 *
 * Flow:
 * 1. Personal Account calls this contract
 * 2. Contract pulls FXRP from Personal Account
 * 3. Swaps FXRP -> USDT via BlazeSwap
 * 4. Deposits USDT into vault, shares go to Personal Account (msg.sender)
 */
contract SwapAndDepositWrapper {
    using SafeERC20 for IERC20;

    IERC20 public immutable fxrp;
    IERC20 public immutable usdt;
    IBlazeSwapRouter public immutable router;
    IERC4626 public immutable vault;

    event SwapAndDeposit(
        address indexed caller,
        uint256 fxrpAmount,
        uint256 usdtReceived,
        uint256 sharesReceived
    );

    constructor(
        address _fxrp,
        address _usdt,
        address _router,
        address _vault
    ) {
        require(_fxrp != address(0), "Invalid FXRP address");
        require(_usdt != address(0), "Invalid USDT address");
        require(_router != address(0), "Invalid router address");
        require(_vault != address(0), "Invalid vault address");

        fxrp = IERC20(_fxrp);
        usdt = IERC20(_usdt);
        router = IBlazeSwapRouter(_router);
        vault = IERC4626(_vault);

        // Approve router and vault with max allowance (one-time setup)
        IERC20(_fxrp).approve(_router, type(uint256).max);
        IERC20(_usdt).approve(_vault, type(uint256).max);
    }

    /**
     * @notice Swap FXRP to USDT and deposit into vault
     * @param fxrpAmount Amount of FXRP to swap (6 decimals)
     * @param minUsdtOut Minimum USDT to receive (slippage protection)
     * @return shares Amount of vault shares received
     *
     * @dev Caller must have approved this contract to spend their FXRP
     *      The Personal Account will have this approval set via a separate instruction
     */
    function swapAndDeposit(
        uint256 fxrpAmount,
        uint256 minUsdtOut
    ) external returns (uint256 shares) {
        // 1. Pull FXRP from caller (Personal Account)
        fxrp.safeTransferFrom(msg.sender, address(this), fxrpAmount);

        // 2. Build swap path
        address[] memory path = new address[](2);
        path[0] = address(fxrp);
        path[1] = address(usdt);

        // 3. Swap FXRP -> USDT via BlazeSwap
        uint256[] memory amounts = router.swapExactTokensForTokens(
            fxrpAmount,
            minUsdtOut,
            path,
            address(this), // USDT goes to this contract first
            block.timestamp + 300 // 5 minute deadline
        );

        uint256 usdtReceived = amounts[1];

        // 4. Deposit USDT into vault, shares go to caller (msg.sender = Personal Account)
        shares = vault.deposit(usdtReceived, msg.sender);

        emit SwapAndDeposit(msg.sender, fxrpAmount, usdtReceived, shares);
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @dev Only callable by the contract itself (for future upgrades)
     */
    function rescueTokens(address token, address to, uint256 amount) external {
        // This is a simple contract, no admin. Tokens can't get stuck
        // because everything is processed atomically.
        revert("Not implemented");
    }
}
