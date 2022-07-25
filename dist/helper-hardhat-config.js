"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERIFICATION_BLOCK_CONFIRMATIONS = exports.developmentChains = exports.networkConfig = void 0;
require("dotenv/config");
const hardhat_1 = require("hardhat");
exports.networkConfig = {
    31337: {
        name: "localhost",
        subscriptionId: +process.env.SUBSCRIPTION_ID,
        gasLane: process.env.GAS_LANE,
        keeperUpdateInterval: "30",
        raffleEntranceFee: "100000000000000000",
        callbackGasLimit: "500000",
        entranceFee: hardhat_1.ethers.utils.parseEther("0.01").toString(),
        interval: "30",
    },
    4: {
        name: "rinkeby",
        subscriptionId: +process.env.SUBSCRIPTION_ID,
        gasLane: process.env.GAS_LANE,
        keeperUpdateInterval: "30",
        raffleEntranceFee: "100000000000000000",
        callbackGasLimit: "500000",
        vrfCoordinatorV2Address: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee: hardhat_1.ethers.utils.parseEther("0.01").toString(),
        interval: "30",
    },
    1: {
        name: "mainnet",
        keeperUpdateInterval: "30",
    },
};
exports.developmentChains = ["hardhat", "localhost"];
exports.VERIFICATION_BLOCK_CONFIRMATIONS = 6;
