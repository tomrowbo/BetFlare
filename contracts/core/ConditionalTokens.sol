// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ConditionalTokens
 * @notice ERC1155 tokens representing YES/NO outcomes for prediction markets
 * @dev Simplified version of Gnosis Conditional Tokens Framework
 */
contract ConditionalTokens is ERC1155 {
    using SafeERC20 for IERC20;

    struct Condition {
        address oracle;
        bytes32 questionId;
        uint256 outcomeSlotCount;
        uint256[] payoutNumerators;
        uint256 payoutDenominator;
        bool resolved;
    }

    mapping(bytes32 => Condition) public conditions;
    mapping(bytes32 => mapping(uint256 => uint256)) public positionBalances;

    IERC20 public collateralToken;

    event ConditionPreparation(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint256 outcomeSlotCount
    );

    event ConditionResolution(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint256 outcomeSlotCount,
        uint256[] payoutNumerators
    );

    event PositionSplit(
        address indexed stakeholder,
        bytes32 indexed conditionId,
        uint256 amount
    );

    event PositionsMerge(
        address indexed stakeholder,
        bytes32 indexed conditionId,
        uint256 amount
    );

    event PayoutRedemption(
        address indexed redeemer,
        bytes32 indexed conditionId,
        uint256[] indexSets,
        uint256 payout
    );

    constructor(address _collateralToken) ERC1155("") {
        collateralToken = IERC20(_collateralToken);
    }

    /**
     * @notice Prepare a condition for a binary outcome
     * @param oracle Address that will resolve the condition
     * @param questionId Unique identifier for the question
     * @param outcomeSlotCount Number of outcomes (2 for binary YES/NO)
     */
    function prepareCondition(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount
    ) external {
        require(outcomeSlotCount >= 2, "Need at least 2 outcomes");

        bytes32 conditionId = getConditionId(oracle, questionId, outcomeSlotCount);
        require(conditions[conditionId].outcomeSlotCount == 0, "Condition already prepared");

        conditions[conditionId] = Condition({
            oracle: oracle,
            questionId: questionId,
            outcomeSlotCount: outcomeSlotCount,
            payoutNumerators: new uint256[](outcomeSlotCount),
            payoutDenominator: 0,
            resolved: false
        });

        emit ConditionPreparation(conditionId, oracle, questionId, outcomeSlotCount);
    }

    /**
     * @notice Report payouts for a condition (only callable by oracle)
     * @param questionId The question being resolved
     * @param payouts Array of payouts for each outcome (e.g., [1, 0] for YES wins)
     */
    function reportPayouts(bytes32 questionId, uint256[] calldata payouts) external {
        uint256 outcomeSlotCount = payouts.length;
        bytes32 conditionId = getConditionId(msg.sender, questionId, outcomeSlotCount);

        Condition storage condition = conditions[conditionId];
        require(condition.outcomeSlotCount > 0, "Condition not prepared");
        require(!condition.resolved, "Already resolved");

        uint256 denominator = 0;
        for (uint256 i = 0; i < outcomeSlotCount; i++) {
            denominator += payouts[i];
        }
        require(denominator > 0, "Payout must be non-zero");

        condition.payoutNumerators = payouts;
        condition.payoutDenominator = denominator;
        condition.resolved = true;

        emit ConditionResolution(conditionId, msg.sender, questionId, outcomeSlotCount, payouts);
    }

    /**
     * @notice Split collateral into outcome tokens
     * @param conditionId The condition to split for
     * @param amount Amount of collateral to split
     */
    function splitPosition(bytes32 conditionId, uint256 amount) external {
        Condition storage condition = conditions[conditionId];
        require(condition.outcomeSlotCount > 0, "Condition not prepared");
        require(!condition.resolved, "Condition already resolved");

        // Transfer collateral from user
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        // Mint outcome tokens (YES and NO for binary)
        for (uint256 i = 0; i < condition.outcomeSlotCount; i++) {
            uint256 positionId = getPositionId(conditionId, i);
            _mint(msg.sender, positionId, amount, "");
        }

        emit PositionSplit(msg.sender, conditionId, amount);
    }

    /**
     * @notice Merge outcome tokens back into collateral
     * @param conditionId The condition to merge for
     * @param amount Amount to merge
     */
    function mergePositions(bytes32 conditionId, uint256 amount) external {
        Condition storage condition = conditions[conditionId];
        require(condition.outcomeSlotCount > 0, "Condition not prepared");

        // Burn all outcome tokens
        for (uint256 i = 0; i < condition.outcomeSlotCount; i++) {
            uint256 positionId = getPositionId(conditionId, i);
            _burn(msg.sender, positionId, amount);
        }

        // Return collateral
        collateralToken.safeTransfer(msg.sender, amount);

        emit PositionsMerge(msg.sender, conditionId, amount);
    }

    /**
     * @notice Redeem winning outcome tokens for collateral
     * @param conditionId The condition to redeem for
     */
    function redeemPositions(bytes32 conditionId) external {
        Condition storage condition = conditions[conditionId];
        require(condition.resolved, "Condition not resolved");

        uint256 totalPayout = 0;
        uint256[] memory indexSets = new uint256[](condition.outcomeSlotCount);

        for (uint256 i = 0; i < condition.outcomeSlotCount; i++) {
            uint256 positionId = getPositionId(conditionId, i);
            uint256 balance = balanceOf(msg.sender, positionId);

            if (balance > 0) {
                indexSets[i] = balance;
                uint256 payout = (balance * condition.payoutNumerators[i]) / condition.payoutDenominator;
                totalPayout += payout;
                _burn(msg.sender, positionId, balance);
            }
        }

        require(totalPayout > 0, "No payout");
        collateralToken.safeTransfer(msg.sender, totalPayout);

        emit PayoutRedemption(msg.sender, conditionId, indexSets, totalPayout);
    }

    /**
     * @notice Get condition ID from parameters
     */
    function getConditionId(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount));
    }

    /**
     * @notice Get position ID for a specific outcome
     */
    function getPositionId(bytes32 conditionId, uint256 outcomeIndex) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(conditionId, outcomeIndex)));
    }

    /**
     * @notice Check if a condition is resolved
     */
    function isResolved(bytes32 conditionId) external view returns (bool) {
        return conditions[conditionId].resolved;
    }

    /**
     * @notice Get payout for a specific outcome
     */
    function getPayoutNumerator(bytes32 conditionId, uint256 outcomeIndex) external view returns (uint256) {
        return conditions[conditionId].payoutNumerators[outcomeIndex];
    }
}
