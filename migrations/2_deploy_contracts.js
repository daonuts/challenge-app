/* global artifacts */
var Challenger = artifacts.require('Challenger.sol')

module.exports = function(deployer) {
  deployer.deploy(Challenger)
}
