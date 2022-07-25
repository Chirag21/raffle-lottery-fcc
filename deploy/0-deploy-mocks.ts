import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../helper-hardhat-config";

const BASE_FEE = "250000000000000000"; // 0.25 ETH is the the premium. Oracle gas. 0.25 ETH per request
const GAS_PRICE_LINK = 1e9; // link per gas, is this the gas lane? 0.000000001 LINK per gas
// calculated value based on the gas price of the chain
// price of requests change based on the price of gas

const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    if (developmentChains.includes(network.name)) {
        log("Local network detected. Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        });
    }

    log("Mocks deployed");
    log("-------------------------------------------------------------");

    log("You are deploying to a local network, you'll need a local network running to interact");
    log(
        "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
    );
    log("----------------------------------");
};

export default deployMocks;
deployMocks.tags = ["all", "mocks"];
