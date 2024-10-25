const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developementChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developementChains.includes(network.name)
    ? describe.skip
    : describe("Staging Test on Raffle", async function () {
          let raffle, deployer, entranceFee
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              entranceFee = await raffle.getEntranceFee()
          })
          describe("fullfillRandomWords", async function () {
              it("works with live chainlink keepers and VRF, we get the random winner ", async function () {
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              console.log(recentWinner)
                              const raffleState = await raffle.getRaffleState()
                              const currTimeStamp = await raffle.getLatestTimeStamp()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[0],
                              )
                              console.log(`Winner ending balance: ${winnerEndingBalance}`)
                              const calculatedEndingBalance =
                                  BigInt(winnerStartingBalance) + BigInt(entranceFee)

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert(raffleState.toString() == "0")
                              assert(currTimeStamp > startingTimeStamp)
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  calculatedEndingBalance.toString(),
                              )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: entranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await ethers.provider.getBalance(accounts[0])
                      console.log(`Winner starting balance: ${winnerStartingBalance}`)
                  })
              })
          })
      })
