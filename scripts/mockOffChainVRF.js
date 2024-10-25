const { ethers, network } = require("hardhat")

async function mockKeepers() {
    const raffle = await ethers.getContract("Raffle")
    const checkData = ethers.keccak256(ethers.toUtf8Bytes(""))

    const { upkeepNeeded } = await raffle.checkUpkeep("0x")

    console.log(`UpKepp Needed : ${upkeepNeeded}`)
    const raffleState = await raffle.getRaffleState()
    console.log(`Raffle state: ${raffleState}`)
    const isTimePassed = await raffle.getLatestTimeStamp()
    console.log(`Current TimeStamp: ${isTimePassed}`)
    const hasPlayers = await raffle.noOfPlayers()
    console.log(`Number of players : ${hasPlayers}`)
    const hasBalance = await ethers.provider.getBalance(raffle.target)
    console.log(`Balance: ${hasBalance}`)

    if (true) {
        const txRes = await raffle.performUpkeep("0x")
        const txReceipt = await txRes.wait(1)
        const requestId = txReceipt.logs[1].args.requestId
        console.log(`Performed upkeep with RequestId: ${requestId}`)
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffle)
        }
    } else {
        console.log("Up keep not Needed")
    }
}

async function mockVrf(requestId, raffle) {
    console.log("We on a local network? Ok let's pretend...")
    const vrfCoordinatorV2_5 = await ethers.getContract("VRFCoordinatorV2_5Mock")
    await vrfCoordinatorV2_5.fulfillRandomWords(requestId, raffle.target)
    const recentwinner = await raffle.getRecentWinner()
    console.log(`The Winner is ${recentwinner}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
