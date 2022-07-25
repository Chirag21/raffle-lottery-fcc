import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers";
import {
    developmentChains,
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";
import { ethers } from "hardhat";
import { VRFCoordinatorV2Mock } from "../typechain-types/@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock";
import verify from "../utils/verify";

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network, ethers } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfV2CoordinatorAddress: string;
    const entranceFee = networkConfig[chainId!]["entranceFee"];
    const gasLane = networkConfig[chainId!]["gasLane"];
    let subscriptionId: number;

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        );
        vrfV2CoordinatorAddress = vrfCoordinatorV2Mock.address;
        const transactionResponse: TransactionResponse =
            await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt: TransactionReceipt = await transactionResponse.wait(1);
        //@ts-ignore
        subscriptionId = transactionReceipt.events[0].args.subId;
        // Fund the subscription
        // On a real network you need real link
        vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfV2CoordinatorAddress = networkConfig[chainId!]["vrfCoordinatorV2Address"]!;
        subscriptionId = networkConfig[chainId!]["subscriptionId"]!;
    }

    const args = [
        vrfV2CoordinatorAddress,
        entranceFee,
        gasLane,
        subscriptionId,
        networkConfig[chainId!]["callbackGasLimit"],
        networkConfig[chainId!]["interval"],
    ];

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying the contract...");
        verify(raffle.address, args);
    }

    log("Run Price Feed contract with command:");
    const networkName = network.name == "hardhat" ? "localhost" : network.name;
    log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`);
    log("----------------------------------------------------");
};

export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];
