const { ethers } = require("hardhat")

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        entranceFee: ethers.parseEther("0.01"),
        keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId:
            "16466491924921865943565942849055690357052450484024273031431019204255794557822",
        callbackGasLimit: "2500000",
        interval: "10",
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.parseEther("0.01"),
        keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit: "500000",
        interval: "10",
    },
}

const developementChains = ["localhost", "hardhat"]

module.exports = { networkConfig, developementChains }
