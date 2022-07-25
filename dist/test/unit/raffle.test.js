"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const helper_hardhat_config_1 = require("../../helper-hardhat-config");
const chai_1 = require("chai");
const time_1 = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time");
!helper_hardhat_config_1.developmentChains.includes(hardhat_1.network.name)
    ? describe.skip
    : describe("Raffle lottery", async () => {
        console.log("Raffle lottery describe");
        let raffle;
        let vrfCoordinatorV2Mock;
        const chainId = hardhat_1.network.config.chainId;
        let raffleEntranceFee;
        const { deployer } = await (0, hardhat_1.getNamedAccounts)();
        beforeEach(async () => {
            console.log("Raffle lottery beforeEach");
            await hardhat_1.deployments.fixture(["all"]);
            raffle = await hardhat_1.ethers.getContract("Raffle", deployer);
            vrfCoordinatorV2Mock = await hardhat_1.ethers.getContract("VRFCoordinatorV2Mock", deployer);
            raffleEntranceFee = await raffle.getEntranceFee();
        });
        describe("constructor", async () => {
            it("initializes the raffle correctly", async () => {
                const raffleState = await raffle.getRaffleState();
                chai_1.assert.equal(raffleState.toString(), "0");
                const interval = await raffle.getInterval();
                chai_1.assert.equal(interval.toString(), helper_hardhat_config_1.networkConfig[chainId]["interval"]);
            });
            it("sets lastTimestamp correctly", async () => {
                const lastTimestamp = await raffle.getLastTimestamp();
                const timestamp = await (0, time_1.latest)();
                chai_1.assert.equal(lastTimestamp.toString(), timestamp.toString());
            });
        });
        describe("enter raffle", async () => {
            // TODO:
            /*               it("reverts if raffle is not open", async () => {
                await expect(
                    raffle.enterRaffle({ value: ethers.utils.parseEther("1") })
                ).to.be.revertedWithCustomError(raffle, "Raffle_NotOpen");
            }); */
            it("reverts when if you don't pay enough", async () => {
                await (0, chai_1.expect)(raffle.enterRaffle()).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughETHSent");
            });
            it("records players when they enter", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const playerFromContract = await raffle.getPlayer(0);
                chai_1.assert.equal(playerFromContract, deployer);
            });
        });
    });
