pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20WithFees is IERC20{

    //owner is the DAO contract
    function setFees(uint256 _fees) external;
}
