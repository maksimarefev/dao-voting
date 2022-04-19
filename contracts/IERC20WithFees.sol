pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20WithFees is IERC20{

    function changeFee(uint256 _fees) external;
}
