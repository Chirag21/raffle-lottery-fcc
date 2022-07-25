"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helper_hardhat_config_1 = require("../helper-hardhat-config");
const hardhat_1 = require("hardhat");
const VRF_SUB_FUND_AMOUNT = hardhat_1.ethers.utils.parseEther("2");
const deployRaffle = async (hre) => {
    const { getNamedAccounts, deployments, network, ethers } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfV2CoordinatorAddress;
    const entranceFee = helper_hardhat_config_1.networkConfig[chainId]["entranceFee"];
    const gasLane = helper_hardhat_config_1.networkConfig[chainId]["gasLane"];
    let subscriptionId;
    const waitBlockConfirmations = helper_hardhat_config_1.developmentChains.includes(network.name)
        ? 1
        : helper_hardhat_config_1.VERIFICATION_BLOCK_CONFIRMATIONS;
    if (helper_hardhat_config_1.developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfV2CoordinatorAddress = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        //@ts-ignore
        subscriptionId = transactionReceipt.events[0].args.subId;
        // Fund the subscription
        // On a real network you need real link
        vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    }
    else {
        vrfV2CoordinatorAddress = helper_hardhat_config_1.networkConfig[chainId]["vrfCoordinatorV2Address"];
        subscriptionId = helper_hardhat_config_1.networkConfig[chainId]["subscriptionId"];
    }
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: [
            vrfV2CoordinatorAddress,
            entranceFee,
            gasLane,
            subscriptionId,
            helper_hardhat_config_1.networkConfig[chainId]["callbackGasLimit"],
            helper_hardhat_config_1.networkConfig[chainId]["interval"],
        ],
        log: true,
        waitConfirmations: waitBlockConfirmations,
    });
    if (!helper_hardhat_config_1.developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying the contract...");
        log("-------------------------------------------------------------------------------------");
    }
};
exports.default = deployRaffle;
deployRaffle.tags = ["all", "raffle"];
