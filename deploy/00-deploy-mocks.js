const { deployments, getNamedAccounts, network } = require("hardhat")
const { developementChains } = require("../helper-hardhat-config")
const BASE_FEE = "100000000000000000" // 0.25 is this the premium in LINK?
const GAS_PRICE_LINK = "1000000000" // link per gas, is this the gas lane? // 0.000000001 LINK per gas
const WEI_PER_UNIT_LINK = "4494216715071842"
module.exports = async function () {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (developementChains.includes(network.name)) {
        log("Local Network Detected. Deploying Mocks.......")
        const args = [BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK /*WEI_PER_UNIT_LINK*/]
        await deploy("VRFCoordinatorV2_5Mock", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: network.config.waitConfirmations || 1,
        })
        log("Mocks Deployed")
        log("-------------------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
