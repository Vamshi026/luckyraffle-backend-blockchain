const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developementChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developementChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, VRFCoordinatorV2_5Mock, deployer, entranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              VRFCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock", deployer)
              entranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("Constructor", function () {
              it("initializes the raffle state correctly", async function () {
                  const raffleState = await raffle.getRaffleState()

                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval, networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", function () {
              it("check for enough entrance fee", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered",
                  )
              })
              it("record players when they enter", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  const firstPlayer = await raffle.getPlayer(0)
                  assert.equal(firstPlayer, deployer)
              })

              it("emit event when enters", async () => {
                  await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(
                      raffle,
                      "RaffleEntered",
                  )
              })
              it("does not allow users to enter while in calculating state", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  //   console.log("Raffle State:", await raffle.getRaffleState())
                  //   console.log("Players:", await raffle.noOfPlayers())
                  //   console.log("Balance:", await ethers.provider.getBalance(raffle.target))

                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.enterRaffle({ value: entranceFee }),
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("returns false if the people doesnt send ETH", async function () {
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep("0x") //raffle.callStatic.checkUpkeep is not working

                  console.log(`in return false if people doenst send eth :${upkeepNeeded}`)
                  assert(!upkeepNeeded)
              })

              it("returns false if raffle isnt open", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.checkUpkeep("0x")
                  console.log(`in return false if raffle isnt open:${upkeepNeeded}`)

                  assert(raffleState.toString(), "1")
                  assert(!upkeepNeeded)
              })

              it("returns false if enough time is not passed", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) - 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep("0x")
                  console.log(`in enough time not passed:${upkeepNeeded}`)
                  assert(!upkeepNeeded)
              })

              it("returns true if enough time is  passed, has eth, players and Open", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep("0x")
                  console.log(`in enough time  passed:${upkeepNeeded}`)
                  assert.equal(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("returns false if checkupkeep is not true", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("must throw Raffle__UpKeepNotNeeded error if upkeep not needed", async function () {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpKeepNotNeeded",
                  )
              })
              it("must change the rafflestate, get requestid and call VRF coordinator", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const txRes = await raffle.performUpkeep("0x")
                  const txReceipt = await txRes.wait(1)
                  const requestId = await txReceipt.logs[1].args.requestId

                  const raffleState = await raffle.getRaffleState()
                  assert(raffleState.toString() == "1")
                  assert(ethers.toNumber(requestId) > 0)
              })
          })

          describe("fullfillRandomWords", async function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("must only be called after performUpkeep", async function () {
                  await expect(
                      VRFCoordinatorV2_5Mock.fulfillRandomWords(0, raffle.target),
                  ).to.be.revertedWithCustomError(VRFCoordinatorV2_5Mock, "InvalidRequest")
                  await expect(
                      VRFCoordinatorV2_5Mock.fulfillRandomWords(1, raffle.target),
                  ).to.be.revertedWithCustomError(VRFCoordinatorV2_5Mock, "InvalidRequest")
              })

              it("picks a winner, resets, and sends money", async function () {
                  const additionalEntrances = 3 // to test
                  const startingIndex = 1
                  const accounts = await ethers.getSigners()
                  let startingBalance
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      // i = 2; i < 5; i=i+1
                      const connectAccounts = await raffle.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                      await connectAccounts.enterRaffle({ value: entranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp() // stores starting timestamp (before we fire our event)

                  // This will be more important for our staging tests...
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          // event listener for WinnerPicked
                          console.log("WinnerPicked event fired!")
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              // Now lets get the ending values...
                              const recentWinner = await raffle.getRecentWinner()
                              console.log(recentWinner)
                              //   console.log(accounts[0])
                              //   console.log(accounts[1])
                              //   console.log(accounts[2])
                              //   console.log(accounts[3])
                              const currTimeStamp = await raffle.getLatestTimeStamp()
                              const raffleState = await raffle.getRaffleState()
                              const numPlayers = await raffle.noOfPlayers()
                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(recentWinner)

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(currTimeStamp > startingTimeStamp, "Timestamp did not update")

                              const calculatedEndingBalance =
                                  BigInt(startingBalance) +
                                  BigInt(entranceFee) * BigInt(additionalEntrances) +
                                  BigInt(entranceFee)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  calculatedEndingBalance.toString(),
                              )

                              resolve()
                          } catch (e) {
                              reject(e) // if try fails, rejects the promise
                          }
                      })

                      // kicking off the event by mocking the chainlink keepers and vrf coordinator
                      try {
                          const tx = await raffle.performUpkeep("0x")
                          const txReceipt = await tx.wait(1)
                          startingBalance = await ethers.provider.getBalance(accounts[1])
                          console.log(
                              "Contract Balance before sending money:",
                              await ethers.provider.getBalance(raffle.target),
                          )
                          console.log(`requestId: ${txReceipt.logs[1].args.requestId}`)
                          await VRFCoordinatorV2_5Mock.fulfillRandomWords(
                              txReceipt.logs[1].args.requestId,
                              raffle.target,
                          )
                      } catch (e) {
                          reject(e)
                      }
                  })
              })

              //   it("selects random winner, sends them money, resets the players", async function () {
              //       const fakeAccounts = 3
              //       const accounts = await ethers.getSigners()

              //       for (let i = 1; i <= fakeAccounts; i++) {
              //           const accountConnected = await raffle.connect(accounts[i])
              //           await accountConnected.enterRaffle({ value: entranceFee })
              //       }

              //       const startTimeStamp = await raffle.getLatestTimeStamp()
              //       const winnerStartingBalance = await ethers.provider.getBalance(accounts[1])

              //       await new Promise(async (resolve, reject) => {
              //           raffle.once("WinnerPicked", async () => {
              //               try {
              //                   const recentWinner = await raffle.getRecentWinner()
              //                   const currTimeStamp = await raffle.getLatestTimeStamp()
              //                   const raffleState = await raffle.getRaffleState()
              //                   const numPlayers = await raffle.noOfPlayers()
              //                   const winnerEndingBalance =
              //                       await ethers.provider.getBalance(recentWinner)

              //                   assert.equal(numPlayers.toString(), "0")
              //                   assert.equal(raffleState.toString(), "0")
              //                   assert(currTimeStamp > startTimeStamp, "Timestamp did not update")

              //                   const calculatedEndingBalance = winnerStartingBalance.add(
              //                       entranceFee.mul(fakeAccounts.add(1)),
              //                   )
              //                   assert.equal(
              //                       winnerEndingBalance.toString(),
              //                       calculatedEndingBalance.toString(),
              //                   )

              //                   resolve()
              //               } catch (error) {
              //                   console.error("Error during WinnerPicked event:", error)
              //                   reject(error)
              //               }
              //           })

              //           const tx = await raffle.performUpkeep("0x")
              //           await tx.wait(1)
              //           await VRFCoordinatorV2_5Mock.fulfillRandomWords(
              //               txReceipt.logs[1].args.requestId,
              //               raffle.target,
              //           )
              //       })
              //   })
          })
      })
