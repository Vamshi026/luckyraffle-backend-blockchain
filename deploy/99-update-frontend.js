const { ethers, network } = require("hardhat")
const fs = require("fs")

const FRONTEND_CURRENT_ADDRESSES_FILE =
    "../nextjs-lucky-raffle/src/constants/contractAddresses.json"
const FRONTEND_ABI_FILE = "../nextjs-lucky-raffle/src/constants/abi.json"

module.exports = async function () {
    console.log("Running deployment script...")

    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating Frontend...")
        await updateContractAddresses()
        await updateAbi()
    } else {
        console.log("UPDATE_FRONTEND is not set to true.")
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    const abiData = raffle.interface.formatJson()
    console.log("Writing ABI to file:", FRONTEND_ABI_FILE)
    fs.writeFileSync(FRONTEND_ABI_FILE, abiData)
    console.log("ABI updated successfully.")
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const chainIdString = network.config.chainId.toString()
    const contractAddresses = JSON.parse(fs.readFileSync(FRONTEND_CURRENT_ADDRESSES_FILE, "utf8"))

    // console.log(`Current contract addresses: ${JSON.stringify(contractAddresses, null, 2)}`)

    if (!contractAddresses[chainIdString]) {
        // console.log(`ChainId: ${chainIdString} not found, adding new entry.`)
        contractAddresses[chainIdString] = [raffle.target]
    } else {
        if (!contractAddresses[chainIdString].includes(raffle.target)) {
            // console.log(`Adding new contract address for ChainId: ${chainIdString}`)
            contractAddresses[chainIdString].push(raffle.target)
        }
    }

    // console.log("Updated contract addresses:", JSON.stringify(contractAddresses, null, 2))
    fs.writeFileSync(FRONTEND_CURRENT_ADDRESSES_FILE, JSON.stringify(contractAddresses, null, 2))
    // console.log("Contract addresses updated successfully.")
}

module.exports.tags = ["all", "frontend"]
