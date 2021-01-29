const BeeswaxToken = artifacts.require('BEESWAX');
const BeeswaxVault = artifacts.require('BeeswaxVault');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const WETH9 = artifacts.require('WETH9');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const FeeApprover = artifacts.require('FeeApprover');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

contract('Liquidity Generation tests', ([alice, john, minter, dev, burner, clean, clean2, clean3, clean4, clean5]) => {

    beforeEach(async () => {

        this.factory = await UniswapV2Factory.new(alice, { from: alice });
        this.weth = await WETH9.new({ from: john });
        this.router = await UniswapV2Router02.new(this.factory.address, this.weth.address, { from: alice });
        this.beeswax = await BeeswaxToken.new(this.router.address, this.weth.address, { from: alice });

        this.feeapprover = await FeeApprover.new({ from: alice });
        await this.feeapprover.initialize(this.beeswax.address, this.weth.address, this.factory.address);
        await this.feeapprover.setPaused(false, { from: alice });

        await this.beeswax.setShouldTransferChecker(this.feeapprover.address, { from: alice });
        this.beeswaxvault = await BeeswaxVault.new({ from: alice });
        await this.beeswaxvault.initialize(this.beeswax.address, dev, clean5);
        await this.feeapprover.setBEESWAXVaultAddress(this.beeswaxvault.address, { from: alice });
    });


    it("Should have a correct balance starting", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
    });

    it("Should not let anyone contribute after timer ", async () => {
        await time.increase(60 * 60 * 24 * 7 + 1);
        await expectRevert(this.beeswax.addLiquidityHNY(true, 0,{ from: clean }), "Liquidity Generation Event over");
    })
    it("Should not let anyone contribute without agreement timer", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        await expectRevert(this.beeswax.addLiquidityHNY(null, 0, { from: clean }), "No agreement provided");

    });

    // it("Should handle deposits of nothing", async () => {
    //     assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
    //     assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
    //     await this.beeswax.addLiquidityHNY(true, { from: clean });
    //     assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
    //     assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
    //     assert.equal((await this.beeswax.hnyContributed(clean)).valueOf().toString(), "0");

    // });

    it("Should update peoples balances", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        await this.weth.deposit({ from: clean, value: '200' })
        await this.weth.deposit({ from: clean2, value: '100' })
        await this.weth.approve(this.beeswax.address, 200, { from: clean});
        await this.weth.approve(this.beeswax.address, 100, { from: clean2});
        await this.beeswax.addLiquidityHNY(true, 99, { from: clean });
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "99");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        assert.equal((await this.beeswax.hnyContributed(clean)).valueOf().toString(), '99');
        await this.beeswax.addLiquidityHNY(true, 101, { from: clean });
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "200");
        assert.equal((await this.beeswax.hnyContributed(clean)).valueOf().toString(), '200');
        await this.beeswax.addLiquidityHNY(true, 100, { from: clean2});
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "300");
        assert.equal((await this.beeswax.hnyContributed(clean)).valueOf().toString(), '200');
        assert.equal((await this.beeswax.hnyContributed(clean2)).valueOf().toString(), '100');
    });


    it("Should create the pair liquidity generation", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        await this.weth.deposit({ from: clean, value: '100' })
        await this.weth.approve(this.beeswax.address, 100, { from: clean});
        await this.beeswax.addLiquidityHNY(true, 100, { from: clean });
        assert.equal((await this.beeswax.hnyContributed(clean)).valueOf().toString(), '100');
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "100");
        await time.increase(60 * 60 * 24 * 7 + 1);
        this.beeswaxWETHPair = await UniswapV2Pair.at(await this.factory.getPair(this.weth.address, this.beeswax.address));
        await this.beeswax.transferLiquidityToHoneyswap();
    });

    it("Should create the pair liquidity with lots of eth", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        await this.weth.deposit({ from: clean, value: '9899998457311' })
        await this.weth.approve(this.beeswax.address, '9899998457311', { from: clean });
        await this.beeswax.addLiquidityHNY(true, 9899998457311, { from: clean });
        assert.equal((await this.beeswax.hnyContributed(clean)).valueOf().toString(), '9899998457311');
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "9899998457311");
        await time.increase(60 * 60 * 24 * 7 + 1);
        this.beeswaxWETHPair = await UniswapV2Pair.at(await this.factory.getPair(this.weth.address, this.beeswax.address));
        await this.beeswax.transferLiquidityToHoneyswap();
        assert.notEqual((await this.beeswaxWETHPair.balanceOf(this.beeswax.address)).valueOf().toString(), "0")
        assert.equal((await this.beeswaxWETHPair.balanceOf(this.beeswax.address)).valueOf().toString(), (await this.beeswax.pairHNY_LPMinted()).valueOf().toString())
    });


    it("Should give out LP tokens up to 1 LP value precision", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        await this.weth.deposit({ from: clean2, value: '9899998457311' })
        await this.weth.approve(this.beeswax.address, 9899998457311, { from: clean2});
        await this.beeswax.addLiquidityHNY(true, 9899998457311, { from: clean2 });
        assert.equal((await this.beeswax.hnyContributed(clean2)).valueOf().toString(), '9899998457311');
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "9899998457311");
        await time.increase(60 * 60 * 24 * 7 + 1);
        this.beeswaxWETHPair = await UniswapV2Pair.at(await this.factory.getPair(this.weth.address, this.beeswax.address));
        await this.beeswax.transferLiquidityToHoneyswap();
        const LPCreated = (await this.beeswax.pairHNY_LPMinted()).valueOf() / 1e18; // To a certain significant
        await this.beeswax.claimLPTokens({ from: clean2 });
        assert.equal((await this.beeswaxWETHPair.balanceOf(clean2)).valueOf() / 1e18, LPCreated)
        assert.equal((await this.beeswaxWETHPair.balanceOf(this.beeswax.address)).valueOf() / 1e18 < 1, true) // smaller than 1 LP token
    });

    it("Should let people withdraw LP proportionally", async () => {
        assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
        assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
        await this.weth.deposit({ from: clean3, value: '5000000000' })
        await this.weth.deposit({ from: clean4, value: '5000000000' })
        await this.weth.approve(this.beeswax.address, 5000000000, { from: clean3});
        await this.weth.approve(this.beeswax.address, 5000000000, { from: clean4});
        await this.beeswax.addLiquidityHNY(true, 5000000000, { from: clean3 });
        await this.beeswax.addLiquidityHNY(true, 5000000000, { from: clean4 });
        assert.equal((await this.beeswax.hnyContributed(clean3)).valueOf().toString(), '5000000000');
        assert.equal((await this.beeswax.hnyContributed(clean3)).valueOf().toString(), '5000000000');
        assert.equal((await this.weth.balanceOf(this.beeswax.address)).valueOf().toString(), "10000000000");
        await time.increase(60 * 60 * 24 * 7 + 1);
        this.beeswaxWETHPair = await UniswapV2Pair.at(await this.factory.getPair(this.weth.address, this.beeswax.address));
        await this.beeswax.transferLiquidityToHoneyswap();
        const LPCreated = (await this.beeswax.pairHNY_LPMinted()).valueOf() / 1e18; // To a certain significant
        await this.beeswax.claimLPTokens({ from: clean3 });
        await expectRevert(this.beeswax.claimLPTokens({ from: clean3 }), "Nothing to claim, move along")
        await this.beeswax.claimLPTokens({ from: clean4 });
        await expectRevert(this.beeswax.claimLPTokens({ from: clean4 }), "Nothing to claim, move along")
        await expectRevert(this.beeswax.claimLPTokens({ from: clean3 }), "Nothing to claim, move along")
        assert.equal((await this.beeswaxWETHPair.balanceOf(clean3)).valueOf() / 1e18, LPCreated / 2)
        assert.equal((await this.beeswaxWETHPair.balanceOf(clean4)).valueOf() / 1e18, LPCreated / 2)
        assert.equal((await this.beeswaxWETHPair.balanceOf(this.beeswax.address)).valueOf() / 1e18 < 1, true) // smaller than 1 LP token

    });

    // it("Should handle emergency withdrawal correctly", async () => {
    //     assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
    //     assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);
    //     await this.beeswax.addLiquidityHNY(true, { from: clean3, value: '500000000000000000' });
    //     await this.beeswax.addLiquidityHNY(true, { from: clean4, value: '500000000000000000' });
    //     await time.increase(60 * 60 * 24 * 7 + 1); // 7 days
    //     await expectRevert(this.beeswax.emergencyDrain24hAfterLiquidityGenerationEventIsDone({ from: alice }), "Liquidity generation grace period still ongoing");
    //     await time.increase(60 * 60 * 24 * 1); // 8 days
    //     assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "1000000000000000000");
    //     assert.equal((await this.beeswax.balanceOf(this.beeswax.address)).valueOf().toString(), 2400e18);

    //     const aliceETHPerviously = (await web3.eth.getBalance(alice)).valueOf() / 1e18  /// more or less cause gas costs
    //     await this.beeswax.emergencyDrain24hAfterLiquidityGenerationEventIsDone({ from: alice });

    //     assert.equal((await web3.eth.getBalance(this.beeswax.address)).valueOf().toString(), "0");
    //     assert.equal(parseInt((await web3.eth.getBalance(alice)).valueOf() / 1e18), parseInt(aliceETHPerviously + 1000000000000000000 / 1e18).toString());

    //     assert.equal((await this.beeswax.balanceOf(alice)).valueOf().toString(), 2400e18);
    // });

    it("Super admin works as expected", async () => {


        await expectRevert(this.beeswaxvault.setStrategyContractOrDistributionContractAllowance(this.beeswax.address, '1', this.beeswax.address, { from: alice }), "Super admin : caller is not super admin.")
        await expectRevert(this.beeswaxvault.setStrategyContractOrDistributionContractAllowance(this.beeswax.address, '1', this.beeswax.address, { from: clean5 }), "Governance setup grace period not over")
    })





});
