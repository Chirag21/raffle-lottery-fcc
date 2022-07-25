import "dotenv/config";
import { ethers } from "hardhat";

export interface networkConfigItem {
    name?: string;
    subscriptionId?: number;
    gasLane?: string;
    keeperUpdateInterval?: string;
    raffleEntranceFee?: string;
    callbackGasLimit?: string;
    vrfCoordinatorV2Address?: string;
    entranceFee?: string;
    interval?: string;
}

export interface NetworkConfig {
    [key: number]: networkConfigItem;
}

export const networkConfig: NetworkConfig = {
    31337: {
        name: "localhost",
        subscriptionId: +process.env.SUBSCRIPTION_ID!,
        gasLane: process.env.GAS_LANE,
        keeperUpdateInterval: "30",
        raffleEntranceFee: "100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000",
        entranceFee: ethers.utils.parseEther("0.01").toString(),
        interval: "30",
    },
    4: {
        name: "rinkeby",
        subscriptionId: +process.env.SUBSCRIPTION_ID!,
        gasLane: process.env.GAS_LANE,
        keeperUpdateInterval: "30",
        raffleEntranceFee: "100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000",
        vrfCoordinatorV2Address: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee: ethers.utils.parseEther("0.01").toString(),
        interval: "30",
    },
    1: {
        name: "mainnet",
        keeperUpdateInterval: "30",
    },
};

export const developmentChains = ["hardhat", "localhost"];
export const frontEndContractsFile =
    "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json";
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
