const { deployments, getNamedAccounts, network, ethers } = require("hardhat")
const { developementChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify.js")

module.exports = async function () {
    const FUND_AMOUNT = "100000000000000000000" //100LINK

    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinatorV2Address, subscriptionId, VRFCoordinatorV2_5Mock

    if (developementChains.includes(network.name)) {
        VRFCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
        vrfCoordinatorV2Address = VRFCoordinatorV2_5Mock.target
        const transactionResponse = await VRFCoordinatorV2_5Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.logs[0].args.subId
        console.log(`Subscription ID : ${subscriptionId}`)
        await VRFCoordinatorV2_5Mock.fundSubscription(subscriptionId, FUND_AMOUNT)

        VRFCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
        await VRFCoordinatorV2_5Mock.addConsumer(subscriptionId, VRFCoordinatorV2_5Mock.target)

        // const subscriptionInfo = await VRFCoordinatorV2_5Mock.getSubscription(subscriptionId)
        // console.log("Subscription balance:", ethers.formatEther(subscriptionInfo.balance))
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
        // console.log(subscriptionId)
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]

    const interval = networkConfig[chainId]["interval"]
    const keyHash = networkConfig[chainId]["keyHash"] // Add keyHash to network config

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        keyHash, // Include keyHash in arguments
        subscriptionId,
        networkConfig[chainId]["callbackGasLimit"],
        interval,
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.waitConfirmations || 1,
    })

    if (developementChains.includes(network.name)) {
        await VRFCoordinatorV2_5Mock.addConsumer(subscriptionId, raffle.address)
    }

    if (!developementChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying.........")
        console.log(raffle.address)
        await verify(raffle.address, args)
    }
    log("-------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
