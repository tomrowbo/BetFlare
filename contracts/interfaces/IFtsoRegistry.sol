// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(
        string memory _symbol
    ) external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals);

    function getCurrentPrice(
        string memory _symbol
    ) external view returns (uint256 _price, uint256 _timestamp);
}
