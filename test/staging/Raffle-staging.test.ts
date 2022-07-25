import { TransactionResponse } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { network, getNamedAccounts, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { Raffle } from "../../typechain-types/contracts/Raffle";

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle lottery", async () => {
          let raffle: Raffle;
          let raffleEntranceFee: BigNumber;
          let deployer: string;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
          });

          describe("fulfillRandomWords", () => {
              it("works with testnet Chainlink keepers and VRF, we get a random winner", async () => {
                  const startingTimestamp = await raffle.getLatestTimestamp();
                  const accounts: SignerWithAddress[] = await ethers.getSigners();

                  // setup the listener before entering the raffle
                  // just in case the blockchain moves really fast
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Winner picked. Event is fired....");
                          try {
                              // add asserts here
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const endingTimestamp = await raffle.getLatestTimestamp();

                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(recentWinner, accounts[0].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              );
                              assert(endingTimestamp.toString() > startingTimestamp.toString());
                              resolve();
                          } catch (error) {
                              console.error(error);
                              reject(error);
                          }
                      });

                      // this code won't complete until our listener has finished listening!
                      // then entering the raffle
                      console.log("Entering the raffle...");
                      const tx: TransactionResponse = await raffle.enterRaffle({
                          value: raffleEntranceFee,
                      });
                      tx.wait(1);
                      console.log("Waiting....");
                      const winnerStartingBalance = await accounts[0].getBalance();
                      // this code won't complete until our listener has finished listening!
                  });
              });
          });
      });
