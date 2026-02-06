// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./ConditionalTokens.sol";

/**
 * @title FPMM - Fixed Product Market Maker
 * @notice AMM for trading YES/NO outcome tokens with gasless meta-transactions
 * @dev Based on Polymarket/Gnosis FPMM design with constant product formula
 */
contract FPMM is ERC1155Holder, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    ConditionalTokens public conditionalTokens;
    IERC20 public collateralToken;
    bytes32 public conditionId;

    uint256 public yesReserve;
    uint256 public noReserve;

    uint256 public constant FEE_BPS = 20; // 0.2% fee
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public totalFees;
    address public vault;

    uint256 public yesPositionId;
    uint256 public noPositionId;

    bool public resolved;

    // EIP-712 type hashes for gasless trading
    bytes32 public constant BUY_YES_TYPEHASH = keccak256("BuyYes(address user,uint256 amount,uint256 nonce,uint256 deadline)");
    bytes32 public constant BUY_NO_TYPEHASH = keccak256("BuyNo(address user,uint256 amount,uint256 nonce,uint256 deadline)");

    // Nonces for replay protection
    mapping(address => uint256) public nonces;

    event Buy(address indexed buyer, bool isYes, uint256 investmentAmount, uint256 tokensReceived);
    event Sell(address indexed seller, bool isYes, uint256 tokensReturned, uint256 collateralReceived);
    event LiquidityAdded(address indexed provider, uint256 amount, uint256 yesTokens, uint256 noTokens);
    event LiquidityRemoved(address indexed provider, uint256 yesTokens, uint256 noTokens, uint256 collateral);
    event FeesCollected(uint256 amount);

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        bytes32 _conditionId,
        address _vault
    ) EIP712("BetFlare FPMM", "1") {
        conditionalTokens = ConditionalTokens(_conditionalTokens);
        collateralToken = IERC20(_collateralToken);
        conditionId = _conditionId;
        vault = _vault;

        yesPositionId = conditionalTokens.getPositionId(_conditionId, 0);
        noPositionId = conditionalTokens.getPositionId(_conditionId, 1);
    }

    /**
     * @notice Add initial liquidity to the market
     * @param amount Amount of collateral to add
     */
    function addLiquidity(uint256 amount) external nonReentrant {
        require(!resolved, "Market resolved");
        require(amount > 0, "Amount must be positive");

        // Transfer collateral
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        // Approve and split into YES/NO tokens
        collateralToken.approve(address(conditionalTokens), amount);
        conditionalTokens.splitPosition(conditionId, amount);

        // Add to reserves
        yesReserve += amount;
        noReserve += amount;

        emit LiquidityAdded(msg.sender, amount, amount, amount);
    }

    /**
     * @notice Buy YES tokens
     * @param investmentAmount Amount of collateral to spend
     * @return tokensReceived Amount of YES tokens received
     */
    function buyYes(uint256 investmentAmount) external nonReentrant returns (uint256 tokensReceived) {
        require(!resolved, "Market resolved");
        require(investmentAmount > 0, "Amount must be positive");

        // Calculate fee
        uint256 fee = (investmentAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netInvestment = investmentAmount - fee;
        totalFees += fee;

        // Transfer collateral from buyer
        collateralToken.safeTransferFrom(msg.sender, address(this), investmentAmount);

        // Send fee to vault
        if (fee > 0 && vault != address(0)) {
            collateralToken.safeTransfer(vault, fee);
            emit FeesCollected(fee);
        }

        // Split investment into YES/NO tokens
        collateralToken.approve(address(conditionalTokens), netInvestment);
        conditionalTokens.splitPosition(conditionId, netInvestment);

        // Calculate tokens using constant product: (yes - out) * (no + in) = yes * no
        // out = yes - (yes * no) / (no + in)
        uint256 k = yesReserve * noReserve;
        uint256 newNoReserve = noReserve + netInvestment;
        uint256 newYesReserve = k / newNoReserve;
        tokensReceived = yesReserve - newYesReserve + netInvestment;

        // Update reserves
        yesReserve = newYesReserve;
        noReserve = newNoReserve;

        // Transfer YES tokens to buyer
        conditionalTokens.safeTransferFrom(address(this), msg.sender, yesPositionId, tokensReceived, "");

        emit Buy(msg.sender, true, investmentAmount, tokensReceived);
    }

    /**
     * @notice Buy NO tokens
     * @param investmentAmount Amount of collateral to spend
     * @return tokensReceived Amount of NO tokens received
     */
    function buyNo(uint256 investmentAmount) external nonReentrant returns (uint256 tokensReceived) {
        require(!resolved, "Market resolved");
        require(investmentAmount > 0, "Amount must be positive");

        // Calculate fee
        uint256 fee = (investmentAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netInvestment = investmentAmount - fee;
        totalFees += fee;

        // Transfer collateral from buyer
        collateralToken.safeTransferFrom(msg.sender, address(this), investmentAmount);

        // Send fee to vault
        if (fee > 0 && vault != address(0)) {
            collateralToken.safeTransfer(vault, fee);
            emit FeesCollected(fee);
        }

        // Split investment into YES/NO tokens
        collateralToken.approve(address(conditionalTokens), netInvestment);
        conditionalTokens.splitPosition(conditionId, netInvestment);

        // Calculate tokens using constant product
        uint256 k = yesReserve * noReserve;
        uint256 newYesReserve = yesReserve + netInvestment;
        uint256 newNoReserve = k / newYesReserve;
        tokensReceived = noReserve - newNoReserve + netInvestment;

        // Update reserves
        yesReserve = newYesReserve;
        noReserve = newNoReserve;

        // Transfer NO tokens to buyer
        conditionalTokens.safeTransferFrom(address(this), msg.sender, noPositionId, tokensReceived, "");

        emit Buy(msg.sender, false, investmentAmount, tokensReceived);
    }

    /**
     * @notice Buy YES tokens with a signed message (gasless for user)
     * @param user The user buying tokens
     * @param investmentAmount Amount of collateral to spend
     * @param deadline Signature expiration timestamp
     * @param signature Packed signature (r, s, v)
     * @return tokensReceived Amount of YES tokens received
     */
    function buyYesWithSignature(
        address user,
        uint256 investmentAmount,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 tokensReceived) {
        require(!resolved, "Market resolved");
        require(block.timestamp <= deadline, "Signature expired");
        require(investmentAmount > 0, "Amount must be positive");

        // Verify signature
        _verifySignature(user, investmentAmount, deadline, true, signature);

        // Execute trade
        tokensReceived = _executeBuyYes(user, investmentAmount);
    }

    /**
     * @notice Buy NO tokens with a signed message (gasless for user)
     * @param user The user buying tokens
     * @param investmentAmount Amount of collateral to spend
     * @param deadline Signature expiration timestamp
     * @param signature Packed signature (r, s, v)
     * @return tokensReceived Amount of NO tokens received
     */
    function buyNoWithSignature(
        address user,
        uint256 investmentAmount,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 tokensReceived) {
        require(!resolved, "Market resolved");
        require(block.timestamp <= deadline, "Signature expired");
        require(investmentAmount > 0, "Amount must be positive");

        // Verify signature
        _verifySignature(user, investmentAmount, deadline, false, signature);

        // Execute trade
        tokensReceived = _executeBuyNo(user, investmentAmount);
    }

    function _verifySignature(
        address user,
        uint256 amount,
        uint256 deadline,
        bool isYes,
        bytes calldata signature
    ) internal {
        bytes32 typeHash = isYes ? BUY_YES_TYPEHASH : BUY_NO_TYPEHASH;
        bytes32 structHash = keccak256(abi.encode(typeHash, user, amount, nonces[user]++, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        require(signer == user, "Invalid signature");
    }

    function _executeBuyYes(address user, uint256 investmentAmount) internal returns (uint256 tokensReceived) {
        uint256 fee = (investmentAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netInvestment = investmentAmount - fee;
        totalFees += fee;

        collateralToken.safeTransferFrom(user, address(this), investmentAmount);

        if (fee > 0 && vault != address(0)) {
            collateralToken.safeTransfer(vault, fee);
            emit FeesCollected(fee);
        }

        collateralToken.approve(address(conditionalTokens), netInvestment);
        conditionalTokens.splitPosition(conditionId, netInvestment);

        uint256 k = yesReserve * noReserve;
        uint256 newNoReserve = noReserve + netInvestment;
        uint256 newYesReserve = k / newNoReserve;
        tokensReceived = yesReserve - newYesReserve + netInvestment;

        yesReserve = newYesReserve;
        noReserve = newNoReserve;

        conditionalTokens.safeTransferFrom(address(this), user, yesPositionId, tokensReceived, "");
        emit Buy(user, true, investmentAmount, tokensReceived);
    }

    function _executeBuyNo(address user, uint256 investmentAmount) internal returns (uint256 tokensReceived) {
        uint256 fee = (investmentAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netInvestment = investmentAmount - fee;
        totalFees += fee;

        collateralToken.safeTransferFrom(user, address(this), investmentAmount);

        if (fee > 0 && vault != address(0)) {
            collateralToken.safeTransfer(vault, fee);
            emit FeesCollected(fee);
        }

        collateralToken.approve(address(conditionalTokens), netInvestment);
        conditionalTokens.splitPosition(conditionId, netInvestment);

        uint256 k = yesReserve * noReserve;
        uint256 newYesReserve = yesReserve + netInvestment;
        uint256 newNoReserve = k / newYesReserve;
        tokensReceived = noReserve - newNoReserve + netInvestment;

        yesReserve = newYesReserve;
        noReserve = newNoReserve;

        conditionalTokens.safeTransferFrom(address(this), user, noPositionId, tokensReceived, "");
        emit Buy(user, false, investmentAmount, tokensReceived);
    }

    /**
     * @notice Sell YES tokens back to the pool
     * @param tokensToSell Amount of YES tokens to sell
     * @return collateralReceived Amount of collateral received
     */
    function sellYes(uint256 tokensToSell) external nonReentrant returns (uint256 collateralReceived) {
        require(!resolved, "Market resolved");
        require(tokensToSell > 0, "Amount must be positive");

        // Transfer YES tokens from seller
        conditionalTokens.safeTransferFrom(msg.sender, address(this), yesPositionId, tokensToSell, "");

        // Calculate collateral using constant product
        uint256 k = yesReserve * noReserve;
        uint256 newYesReserve = yesReserve + tokensToSell;
        uint256 newNoReserve = k / newYesReserve;
        uint256 noTokensOut = noReserve - newNoReserve;

        // Merge the minimum of YES tokens added and NO tokens removed
        uint256 mergeAmount = noTokensOut < tokensToSell ? noTokensOut : tokensToSell;
        conditionalTokens.mergePositions(conditionId, mergeAmount);

        // Calculate fee
        uint256 fee = (mergeAmount * FEE_BPS) / BPS_DENOMINATOR;
        collateralReceived = mergeAmount - fee;
        totalFees += fee;

        // Update reserves
        yesReserve = newYesReserve - mergeAmount;
        noReserve = newNoReserve;

        // Send fee to vault
        if (fee > 0 && vault != address(0)) {
            collateralToken.safeTransfer(vault, fee);
            emit FeesCollected(fee);
        }

        // Transfer collateral to seller
        collateralToken.safeTransfer(msg.sender, collateralReceived);

        emit Sell(msg.sender, true, tokensToSell, collateralReceived);
    }

    /**
     * @notice Sell NO tokens back to the pool
     * @param tokensToSell Amount of NO tokens to sell
     * @return collateralReceived Amount of collateral received
     */
    function sellNo(uint256 tokensToSell) external nonReentrant returns (uint256 collateralReceived) {
        require(!resolved, "Market resolved");
        require(tokensToSell > 0, "Amount must be positive");

        // Transfer NO tokens from seller
        conditionalTokens.safeTransferFrom(msg.sender, address(this), noPositionId, tokensToSell, "");

        // Calculate collateral using constant product
        uint256 k = yesReserve * noReserve;
        uint256 newNoReserve = noReserve + tokensToSell;
        uint256 newYesReserve = k / newNoReserve;
        uint256 yesTokensOut = yesReserve - newYesReserve;

        // Merge the minimum of NO tokens added and YES tokens removed
        uint256 mergeAmount = yesTokensOut < tokensToSell ? yesTokensOut : tokensToSell;
        conditionalTokens.mergePositions(conditionId, mergeAmount);

        // Calculate fee
        uint256 fee = (mergeAmount * FEE_BPS) / BPS_DENOMINATOR;
        collateralReceived = mergeAmount - fee;
        totalFees += fee;

        // Update reserves
        yesReserve = newYesReserve;
        noReserve = newNoReserve - mergeAmount;

        // Send fee to vault
        if (fee > 0 && vault != address(0)) {
            collateralToken.safeTransfer(vault, fee);
            emit FeesCollected(fee);
        }

        // Transfer collateral to seller
        collateralToken.safeTransfer(msg.sender, collateralReceived);

        emit Sell(msg.sender, false, tokensToSell, collateralReceived);
    }

    /**
     * @notice Get current YES price (0-1e18 representing 0%-100%)
     */
    function getYesPrice() external view returns (uint256) {
        if (yesReserve == 0 && noReserve == 0) return 5e17; // 50%
        return (noReserve * 1e18) / (yesReserve + noReserve);
    }

    /**
     * @notice Get current NO price (0-1e18 representing 0%-100%)
     */
    function getNoPrice() external view returns (uint256) {
        if (yesReserve == 0 && noReserve == 0) return 5e17; // 50%
        return (yesReserve * 1e18) / (yesReserve + noReserve);
    }

    /**
     * @notice Calculate YES tokens received for a given investment
     */
    function calcBuyYes(uint256 investmentAmount) external view returns (uint256) {
        uint256 fee = (investmentAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netInvestment = investmentAmount - fee;

        uint256 k = yesReserve * noReserve;
        uint256 newNoReserve = noReserve + netInvestment;
        uint256 newYesReserve = k / newNoReserve;
        return yesReserve - newYesReserve + netInvestment;
    }

    /**
     * @notice Calculate NO tokens received for a given investment
     */
    function calcBuyNo(uint256 investmentAmount) external view returns (uint256) {
        uint256 fee = (investmentAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netInvestment = investmentAmount - fee;

        uint256 k = yesReserve * noReserve;
        uint256 newYesReserve = yesReserve + netInvestment;
        uint256 newNoReserve = k / newYesReserve;
        return noReserve - newNoReserve + netInvestment;
    }

    /**
     * @notice Mark market as resolved (called by resolver)
     */
    function markResolved() external {
        require(conditionalTokens.isResolved(conditionId), "Condition not resolved");
        resolved = true;
    }

    /**
     * @notice Get EIP-712 domain separator for signature verification
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
