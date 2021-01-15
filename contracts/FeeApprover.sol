

pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol"; // for WETH
import "@nomiclabs/buidler/console.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

contract FeeApprover is OwnableUpgradeSafe {
    using SafeMath for uint256;

    function initialize(
        address _BEESWAXAddress,
        address _HNYAddress,
        address _uniswapFactory
    ) public initializer {
        OwnableUpgradeSafe.__Ownable_init();
        BEESWAXTokenAddress = _BEESWAXAddress;
        HNYAddress = _HNYAddress;
        tokenUniswapPair = IUniswapV2Factory(_uniswapFactory).getPair(HNYAddress,BEESWAXTokenAddress);
        feePercentX100 = 11;
        paused = false; // We start paused until sync post LGE happens.
    }

    address tokenUniswapPair;
    IUniswapV2Factory public uniswapFactory;
    address internal HNYAddress;
    address BEESWAXTokenAddress;
    address BEESWAXVaultAddress;
    uint8 public feePercentX100;  // max 255 = 25.5% artificial clamp
    uint256 public lastTotalSupplyOfLPTokens;
    bool paused;

    
    function setPaused(bool _pause) public onlyOwner {
        paused = _pause;
        sync();
    }

    function setFeeMultiplier(uint8 _feeMultiplier) public onlyOwner {
        require(_feeMultiplier <= 255, 'Fee can only be 25.5% or less');
        feePercentX100 = _feeMultiplier;
    }

    function setBEESWAXVaultAddress(address _BEESWAXVaultAddress) public onlyOwner {
        BEESWAXVaultAddress = _BEESWAXVaultAddress;
    }

    function sync() public {
        uint256 _LPSupplyOfPairTotal = IERC20(tokenUniswapPair).totalSupply();
        lastTotalSupplyOfLPTokens = _LPSupplyOfPairTotal;
    }

    function calculateAmountsAfterFee(
        address sender,
        address recipient,
        uint256 amount
        ) public  returns (uint256 transferToAmount, uint256 transferToFeeDistributorAmount)
        {
            require(paused == false, "FEE APPROVER: Transfers Paused");
            uint256 _LPSupplyOfPairTotal = IERC20(tokenUniswapPair).totalSupply();

            if(sender == tokenUniswapPair)
                require(lastTotalSupplyOfLPTokens <= _LPSupplyOfPairTotal, "Liquidity withdrawals forbidden");


            if(sender == BEESWAXVaultAddress || sender == tokenUniswapPair ) { // Dont have a fee when BEESWAXVault is sending, or infinite loop
                console.log("Sending without fee");                       // And when pair is sending ( buys are happening, no tax on it)
                transferToFeeDistributorAmount = 0;
                transferToAmount = amount;
            }
            else {
                console.log("Normal fee transfer");
                transferToFeeDistributorAmount = amount.mul(feePercentX100).div(1000);
                transferToAmount = amount.sub(transferToFeeDistributorAmount);
            }


           lastTotalSupplyOfLPTokens = _LPSupplyOfPairTotal;
        }


}
