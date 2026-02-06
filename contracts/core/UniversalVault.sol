// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ILiquidityRouter {
    function deployLiquidity(uint256 amount) external;
    function withdrawFromMarkets(uint256 amount) external returns (uint256);
    function getTotalDeployed() external view returns (uint256);
}

interface IBlazeSwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

/**
 * @title UniversalVault
 * @notice ERC4626 vault that accepts USDT0 or XRP (auto-converted) and deploys liquidity to prediction markets
 * @dev LPs receive vault shares representing their proportional ownership of all deployed liquidity + fees
 */
contract UniversalVault is ERC4626, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    ILiquidityRouter public router;
    IBlazeSwapRouter public blazeSwap;
    IERC20 public wrappedXRP;

    uint256 public totalFeesReceived;

    // Markets authorized to send fees
    mapping(address => bool) public authorizedMarkets;

    event RouterSet(address indexed router);
    event BlazeSwapSet(address indexed blazeSwap, address indexed wrappedXRP);
    event MarketAuthorized(address indexed market, bool authorized);
    event XRPDeposited(address indexed depositor, address indexed receiver, uint256 xrpAmount, uint256 usdtReceived, uint256 shares);
    event FeesReceived(address indexed market, uint256 amount);

    constructor(
        IERC20 _usdt
    ) ERC4626(_usdt) ERC20("BetFlare LP", "bfLP") Ownable(msg.sender) {}

    // ============ Admin Functions ============

    function setRouter(address _router) external onlyOwner {
        router = ILiquidityRouter(_router);
        emit RouterSet(_router);
    }

    function setBlazeSwap(address _blazeSwap, address _wrappedXRP) external onlyOwner {
        blazeSwap = IBlazeSwapRouter(_blazeSwap);
        wrappedXRP = IERC20(_wrappedXRP);
        emit BlazeSwapSet(_blazeSwap, _wrappedXRP);
    }

    function authorizeMarket(address market, bool authorized) external onlyOwner {
        authorizedMarkets[market] = authorized;
        emit MarketAuthorized(market, authorized);
    }

    // ============ Deposit Functions ============

    /**
     * @notice Deposit USDT0 and receive vault shares
     * @dev Immediately routes to AMMs via router
     */
    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256 shares) {
        shares = super.deposit(assets, receiver);

        // Immediately deploy to markets if router is set
        if (address(router) != address(0)) {
            IERC20(asset()).approve(address(router), assets);
            router.deployLiquidity(assets);
        }
    }

    /**
     * @notice Deposit wrapped XRP, auto-convert to USDT0 via BlazeSwap
     * @param xrpAmount Amount of wrapped XRP to deposit
     * @param minUsdtOut Minimum USDT0 to receive (slippage protection)
     * @param receiver Address to receive vault shares
     */
    function depositXRP(
        uint256 xrpAmount,
        uint256 minUsdtOut,
        address receiver
    ) external nonReentrant returns (uint256 shares) {
        require(address(blazeSwap) != address(0), "BlazeSwap not configured");
        require(address(wrappedXRP) != address(0), "Wrapped XRP not configured");

        // Transfer XRP from user
        wrappedXRP.safeTransferFrom(msg.sender, address(this), xrpAmount);

        // Approve BlazeSwap
        wrappedXRP.approve(address(blazeSwap), xrpAmount);

        // Swap XRP -> USDT0
        address[] memory path = new address[](2);
        path[0] = address(wrappedXRP);
        path[1] = asset();

        uint256[] memory amounts = blazeSwap.swapExactTokensForTokens(
            xrpAmount,
            minUsdtOut,
            path,
            address(this),
            block.timestamp + 300
        );

        uint256 usdtReceived = amounts[1];

        // Calculate and mint shares
        shares = previewDeposit(usdtReceived);
        _mint(receiver, shares);

        // Immediately deploy to markets if router is set
        if (address(router) != address(0)) {
            IERC20(asset()).approve(address(router), usdtReceived);
            router.deployLiquidity(usdtReceived);
        }

        emit XRPDeposited(msg.sender, receiver, xrpAmount, usdtReceived, shares);
    }

    /**
     * @notice Get quote for XRP -> USDT conversion
     */
    function getXRPQuote(uint256 xrpAmount) external view returns (uint256 usdtOut) {
        if (address(blazeSwap) == address(0)) return 0;

        address[] memory path = new address[](2);
        path[0] = address(wrappedXRP);
        path[1] = asset();

        uint256[] memory amounts = blazeSwap.getAmountsOut(xrpAmount, path);
        return amounts[1];
    }

    // ============ Withdrawal Functions ============

    /**
     * @notice Withdraw assets - may need to pull from markets
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256 shares) {
        // Check if we have enough idle assets
        uint256 idle = IERC20(asset()).balanceOf(address(this));

        if (idle < assets && address(router) != address(0)) {
            // Need to withdraw from markets
            uint256 needed = assets - idle;
            router.withdrawFromMarkets(needed);
        }

        shares = super.withdraw(assets, receiver, owner);
    }

    // ============ Fee Collection ============

    /**
     * @notice Receive fees from authorized markets
     */
    function receiveFees(uint256 amount) external {
        require(authorizedMarkets[msg.sender], "Not authorized");

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        totalFeesReceived += amount;

        emit FeesReceived(msg.sender, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Total assets = idle + deployed in markets
     */
    function totalAssets() public view override returns (uint256) {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        uint256 deployed = address(router) != address(0) ? router.getTotalDeployed() : 0;
        return idle + deployed;
    }

    /**
     * @notice Check if BlazeSwap is configured for XRP deposits
     */
    function isXRPEnabled() external view returns (bool) {
        return address(blazeSwap) != address(0) && address(wrappedXRP) != address(0);
    }
}
