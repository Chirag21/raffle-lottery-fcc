import { getNamedAccounts, deployments, network, ethers, getUnnamedAccounts } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle } from "../../typechain-types/contracts/Raffle";
import { VRFCoordinatorV2Mock } from "../../typechain-types/@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock";
import { assert, expect } from "chai";
import { latest } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";
import { BigNumber } from "ethers";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle lottery", async () => {
          let raffle: Raffle;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          const chainId = network.config.chainId;
          let raffleEntranceFee: BigNumber;
          let deployer: string;
          let interval: BigNumber;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              raffle = await ethers.getContract("Raffle", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "0");
                  assert.equal(interval.toString(), networkConfig[chainId!]["interval"]);
              });

              it("sets lastTimestamp correctly", async () => {
                  const lastTimestamp = await raffle.getLatestTimestamp();
                  const timestamp = await latest();
                  assert.equal(lastTimestamp.toString(), timestamp.toString());
              });
          });

          describe("enter raffle", () => {
              it("reverts when if you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHSent"
                  );
              });

              it("records players when they enter, contract balance is increased", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const playerFromContract: string = await raffle.getPlayer(0);
                  assert.equal(playerFromContract, deployer);
                  const contractBalance = await raffle.provider.getBalance(raffle.address);
                  assert.equal(contractBalance.toString(), raffleEntranceFee.toString());
              });

              it("emits an event with player's address on successful enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee }))
                      .to.emit(raffle, "RaffleEnter")
                      .withArgs(deployer);
              });

              it("doesn't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });

                  const contractBalance = await raffle.provider.getBalance(raffle.address);
                  const numPlayers = await raffle.getNumberOfPLayers();
                  const raffleState = await raffle.getRaffleState();

                  // increase time and mine a block, so that interval will have passed and checkUpkeep() will return true
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine"); // 2nd argument is optional
                  //await network.provider.request({ method: "evm_mine" });

                  // now checkUpkeep() will return true, hence we can call performUpkeep and raffle will move into calculating state
                  // we pretend to be chainlink keeper. performUpkeep() is called by the keeper
                  await raffle.performUpkeep([]); // pass blank calldata
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
              });
          });

          describe("checkUpkeep", () => {
              it("returns false if raffle is not open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine");
                  await raffle.performUpkeep([]);
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert.equal(raffleState.toString(), "1");
                  assert.equal(upkeepNeeded, false);
              });

              it("returns false if not enough time has passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]);
                  await network.provider.request({ method: "evm_mine" });
                  expect(await raffle.callStatic.checkUpkeep("0x")).to.include(false); // passing 0x as empty bytes
              });

              it("returns false if there are no players", async () => {
                  const numOfPlayers = await raffle.callStatic.getNumberOfPLayers();
                  assert.equal(numOfPlayers.toString(), "0");
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]); // passing [] as empty bytes
                  assert(!upkeepNeeded);
              });

              it("returns false if people have not send enough ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine");
                  // callStatic does not send a transaction instead it simulates sending a transaction
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("returns true if enough time has passes, raffle is open, there are players, there is balance", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine");
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // passing 0x as empty bytes
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", () => {
              it("can only run if checkUpkeep returns true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine");
                  const tx = await raffle.performUpkeep([]);
                  assert(tx);
              });

              it("reverts if checkUpkeep() returns false", async () => {
                  const balance = await raffle.provider.getBalance(raffle.address);
                  const numOfPlayers = await raffle.getNumberOfPLayers();
                  const raffleState = await raffle.getRaffleState();
                  await expect(raffle.performUpkeep("0x"))
                      .to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded")
                      .withArgs(balance, numOfPlayers, raffleState);
              });

              it("updates the raffle state, emits an event, and calls the vrfCoordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine");
                  const txResponse: TransactionResponse = await raffle.performUpkeep("0x");
                  const txReceipt: TransactionReceipt = await txResponse.wait(1);

                  // vrfCoordinator emits an event from it's function
                  // Raffle contract event is emitted after this event, hence it is present at index 1
                  //@ts-ignore
                  const requestId = <number>txReceipt.events[1].args.requestId;
                  assert(requestId > 0, "In valid requestId");
                  const raffleState = await raffle.getRaffleState();
                  assert(raffleState == 1, "Raffle state not changed");
              });
          });

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine");
              });

              it("can only be called after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("picks a winner, resets the lottery, sends the money to winner", async () => {
                  const additionalEntrants = 3;
                  const startingAccountIndex = 1;
                  const accounts = await ethers.getSigners(); // since deployer 0
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      await raffle.connect(accounts[i]).enterRaffle({ value: raffleEntranceFee });
                  }
                  const startingTimestamp = await raffle.getLatestTimestamp();

                  // performUpkeep (mock being chainlink keeper)
                  // fulfillRandomWords (mock being the chainlink VRF)
                  // We will have to wait for the fulfillRandomWords to be called
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              console.log(recentWinner);
                              console.log(accounts[1].address); // always winner

                              const raffleState = await raffle.getRaffleState();
                              const numOfPlayers = await raffle.getNumberOfPLayers();
                              const endingTimestamp = await raffle.getLatestTimestamp();
                              const winnerEndingBalance = await accounts[1].getBalance();

                              assert.equal(recentWinner, accounts[1].address);
                              assert.equal(numOfPlayers.toNumber(), 0);
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(raffleState, 0);
                              assert(endingTimestamp.toString() > startingTimestamp.toString());
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              );
                              resolve();
                          } catch (error: any) {
                              reject(error);
                          }
                      });

                      // below, we will fire the event, and the listener will pick it up, and resolve
                      const tx: TransactionResponse = await raffle.performUpkeep([]);
                      const txReceipt: TransactionReceipt = await tx.wait(1);
                      const winnerStartingBalance = await accounts[1].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          //@ts-ignore
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
