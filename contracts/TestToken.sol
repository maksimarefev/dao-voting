pragma solidity ^0.8.0;

import "./IERC20WithFees.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is IERC20WithFees, ERC20, Ownable {

    uint256 public fees;

    constructor() public ERC20("TestToken", "TST") {
        _mint(msg.sender, 10 * (10 ** decimals()));
    }

    //owner is the DAO contract
    function setFees(uint256 _fees) public override onlyOwner {
        fees = _fees;
    }
}
