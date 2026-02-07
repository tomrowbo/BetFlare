// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFPMM {
    function addLiquidity(uint256 amount) external;
    function removeLiquidity(uint256 amount) external returns (uint256);
    function withdrawAfterResolution() external returns (uint256);
    function setRouter(address router) external;
    function yesReserve() external view returns (uint256);
    function noReserve() external view returns (uint256);
    function collateralToken() external view returns (address);
    function resolved() external view returns (bool);
}

/**
 * @title LiquidityRouter
 * @notice Manages liquidity deployment from UniversalVault to multiple FPMM markets
 * @dev UUPS upgradeable. Distributes liquidity equally across all active markets and handles rebalancing
 */
contract LiquidityRouter is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    address public vault;
    address public factory;
    IERC20 public usdt;

    struct MarketAllocation {
        uint256 deployedAmount;
        bool active;
        uint256 index; // Position in activeMarkets array
    }

    mapping(address => MarketAllocation) public allocations;
    address[] public activeMarkets;

    event VaultSet(address indexed vault);
    event FactorySet(address indexed factory);
    event MarketRegistered(address indexed fpmm);
    event MarketDeregistered(address indexed fpmm);
    event LiquidityDeployed(uint256 totalAmount, uint256 marketsCount);
    event LiquidityWithdrawn(uint256 amount);
    event Rebalanced(uint256 marketsCount);

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory || msg.sender == owner(), "Only factory or owner");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _usdt) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        usdt = IERC20(_usdt);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Admin Functions ============

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultSet(_vault);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
        emit FactorySet(_factory);
    }

    // ============ Market Management ============

    /**
     * @notice Register a new FPMM market for liquidity deployment
     * @dev Called by factory when new market is created, triggers rebalancing
     */
    function registerMarket(address fpmm) external onlyFactory {
        require(!allocations[fpmm].active, "Already registered");

        allocations[fpmm] = MarketAllocation({
            deployedAmount: 0,
            active: true,
            index: activeMarkets.length
        });
        activeMarkets.push(fpmm);

        emit MarketRegistered(fpmm);

        // Rebalance if we have deployed liquidity
        if (getTotalDeployed() > 0) {
            _rebalance();
        }
    }

    /**
     * @notice Deregister a resolved/closed market
     * @dev Withdraws all liquidity from the market and redistributes
     */
    function deregisterMarket(address fpmm) external onlyOwner {
        require(allocations[fpmm].active, "Not registered");

        // Remove from active markets array
        uint256 index = allocations[fpmm].index;
        uint256 lastIndex = activeMarkets.length - 1;

        if (index != lastIndex) {
            address lastMarket = activeMarkets[lastIndex];
            activeMarkets[index] = lastMarket;
            allocations[lastMarket].index = index;
        }
        activeMarkets.pop();

        // Mark as inactive
        allocations[fpmm].active = false;
        allocations[fpmm].deployedAmount = 0;

        emit MarketDeregistered(fpmm);

        // Rebalance remaining markets
        if (activeMarkets.length > 0) {
            _rebalance();
        }
    }

    /**
     * @notice Reclaim liquidity from a resolved market
     * @dev Calls withdrawAfterResolution on the FPMM to redeem winning tokens
     * @param fpmm The resolved market to reclaim from
     * @return recovered Amount of collateral recovered
     */
    function reclaimFromResolved(address fpmm) external onlyOwner nonReentrant returns (uint256 recovered) {
        require(IFPMM(fpmm).resolved(), "Market not resolved");

        // Withdraw from resolved market (redeems winning outcome tokens)
        recovered = IFPMM(fpmm).withdrawAfterResolution();

        // Send recovered funds to vault
        if (recovered > 0 && vault != address(0)) {
            usdt.safeTransfer(vault, recovered);
        }

        emit LiquidityWithdrawn(recovered);
    }

    // ============ Liquidity Deployment ============

    /**
     * @notice Deploy new liquidity equally across all active markets
     * @param amount Total amount of USDT to deploy
     */
    function deployLiquidity(uint256 amount) external onlyVault nonReentrant {
        require(activeMarkets.length > 0, "No active markets");

        // Transfer USDT from vault
        usdt.safeTransferFrom(vault, address(this), amount);

        // Equal distribution
        uint256 perMarket = amount / activeMarkets.length;
        uint256 deployed = 0;

        for (uint256 i = 0; i < activeMarkets.length; i++) {
            address fpmm = activeMarkets[i];
            uint256 toDeposit = (i == activeMarkets.length - 1)
                ? (amount - deployed)  // Last market gets remainder
                : perMarket;

            // Approve and add liquidity
            usdt.approve(fpmm, toDeposit);
            IFPMM(fpmm).addLiquidity(toDeposit);

            allocations[fpmm].deployedAmount += toDeposit;
            deployed += toDeposit;
        }

        emit LiquidityDeployed(amount, activeMarkets.length);
    }

    /**
     * @notice Withdraw liquidity from markets for vault redemptions
     * @dev Withdraws proportionally from all markets
     * @return actual Amount actually withdrawn
     */
    function withdrawFromMarkets(uint256 amount) external onlyVault nonReentrant returns (uint256 actual) {
        require(activeMarkets.length > 0, "No active markets");
        uint256 totalDeployed = getTotalDeployed();
        require(totalDeployed > 0, "Nothing deployed");

        // Calculate how much to withdraw from each market (proportional)
        uint256 remaining = amount;

        for (uint256 i = 0; i < activeMarkets.length && remaining > 0; i++) {
            address fpmm = activeMarkets[i];
            uint256 deployed = allocations[fpmm].deployedAmount;

            if (deployed == 0) continue;

            // Proportional withdrawal: (amount * deployed) / totalDeployed
            uint256 toWithdraw = (amount * deployed) / totalDeployed;
            if (toWithdraw > deployed) toWithdraw = deployed;
            if (toWithdraw > remaining) toWithdraw = remaining;

            if (toWithdraw > 0) {
                // Pull from FPMM
                uint256 received = IFPMM(fpmm).removeLiquidity(toWithdraw);
                allocations[fpmm].deployedAmount -= toWithdraw;
                actual += received;
                remaining -= toWithdraw;
            }
        }

        // Transfer to vault
        if (actual > 0) {
            usdt.safeTransfer(vault, actual);
        }

        emit LiquidityWithdrawn(actual);
    }

    /**
     * @notice Rebalance liquidity across all markets to equal distribution
     */
    function rebalance() external onlyOwner {
        _rebalance();
    }

    function _rebalance() internal {
        uint256 n = activeMarkets.length;
        if (n == 0) return;

        // Calculate current total liquidity across all markets (using actual reserves)
        uint256 totalLiquidity = 0;
        uint256[] memory currentBalances = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            address fpmm = activeMarkets[i];
            // Use minimum of yes/no reserves as the "rebalanceable" liquidity
            uint256 yes = IFPMM(fpmm).yesReserve();
            uint256 no = IFPMM(fpmm).noReserve();
            currentBalances[i] = yes < no ? yes : no;
            totalLiquidity += currentBalances[i];
        }

        if (totalLiquidity == 0) return;

        // Target per market
        uint256 targetPerMarket = totalLiquidity / n;

        // First pass: withdraw from over-allocated markets
        for (uint256 i = 0; i < n; i++) {
            if (currentBalances[i] > targetPerMarket) {
                uint256 excess = currentBalances[i] - targetPerMarket;
                address fpmm = activeMarkets[i];

                // Remove excess liquidity
                uint256 received = IFPMM(fpmm).removeLiquidity(excess);
                allocations[fpmm].deployedAmount = targetPerMarket;

                // Router now holds the withdrawn USDT
            }
        }

        // Second pass: deposit to under-allocated markets
        uint256 available = usdt.balanceOf(address(this));
        for (uint256 i = 0; i < n && available > 0; i++) {
            if (currentBalances[i] < targetPerMarket) {
                uint256 deficit = targetPerMarket - currentBalances[i];
                if (deficit > available) deficit = available;

                address fpmm = activeMarkets[i];
                usdt.approve(fpmm, deficit);
                IFPMM(fpmm).addLiquidity(deficit);
                allocations[fpmm].deployedAmount = targetPerMarket;

                available -= deficit;
            }
        }

        emit Rebalanced(n);
    }

    // ============ View Functions ============

    /**
     * @notice Get total USDT deployed across all markets
     */
    function getTotalDeployed() public view returns (uint256 total) {
        for (uint256 i = 0; i < activeMarkets.length; i++) {
            total += allocations[activeMarkets[i]].deployedAmount;
        }
    }

    /**
     * @notice Get number of active markets
     */
    function getActiveMarketsCount() external view returns (uint256) {
        return activeMarkets.length;
    }

    /**
     * @notice Get all active market addresses
     */
    function getActiveMarkets() external view returns (address[] memory) {
        return activeMarkets;
    }

    /**
     * @notice Get deployment info for a specific market
     */
    function getMarketAllocation(address fpmm) external view returns (
        uint256 deployedAmount,
        bool active,
        uint256 currentLiquidity
    ) {
        MarketAllocation memory alloc = allocations[fpmm];
        deployedAmount = alloc.deployedAmount;
        active = alloc.active;

        if (active) {
            currentLiquidity = IFPMM(fpmm).yesReserve() + IFPMM(fpmm).noReserve();
        }
    }
}
