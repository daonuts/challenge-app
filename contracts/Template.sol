/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";

import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

import "@daonuts/capped-voting/contracts/CappedVoting.sol";
import "@daonuts/token/contracts/Token.sol";

import "./Challenge.sol";


contract TemplateBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployDao(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = TemplateBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}


contract Template is TemplateBase {
    /* MiniMeTokenFactory tokenFactory; */

    uint constant TOKEN_UNIT = 10 ** 18;
    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        /* tokenFactory = new MiniMeTokenFactory(); */
    }

    function newInstance() public {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        address root = msg.sender;
        bytes32 challengeAppId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("challenge-app")));
        bytes32 cappedVotingAppId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("capped-voting-app")));
        bytes32 tokenManagerAppId = apmNamehash("token-manager");

        Challenge challenge = Challenge(dao.newAppInstance(challengeAppId, latestVersionAppBase(challengeAppId)));
        TokenManager contribManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        TokenManager currencyManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        CappedVoting voting = CappedVoting(dao.newAppInstance(cappedVotingAppId, latestVersionAppBase(cappedVotingAppId)));

        /* MiniMeToken contrib = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Contrib", 18, "CONTRIB", false); */
        Token contrib = new Token("Contrib", 18, "CONTRIB", false);
        /* MiniMeToken currency = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Currency", 18, "CURRENCY", true); */
        Token currency = new Token("Currency", 18, "CURRENCY", true);
        contrib.changeController(contribManager);
        currency.changeController(currencyManager);

        // Initialize apps
        contribManager.initialize(MiniMeToken(contrib), false, 0);
        emit InstalledApp(contribManager, tokenManagerAppId);
        currencyManager.initialize(MiniMeToken(currency), true, 0);
        emit InstalledApp(currencyManager, tokenManagerAppId);

        challenge.initialize(currencyManager, 100*TOKEN_UNIT, 10*TOKEN_UNIT, 50*TOKEN_UNIT, uint64(1 minutes), uint64(1 minutes), uint64(1 minutes));
        emit InstalledApp(challenge, challengeAppId);
        voting.initialize(contrib, currency, uint64(60*PCT), uint64(15*PCT), uint64(20 minutes));
        emit InstalledApp(voting, cappedVotingAppId);

        acl.createPermission(root, voting, voting.CREATE_VOTES_ROLE(), root);

        acl.createPermission(ANY_ENTITY, challenge, challenge.PROPOSE_ROLE(), voting);
        acl.createPermission(ANY_ENTITY, challenge, challenge.CHALLENGE_ROLE(), voting);
        acl.createPermission(voting, challenge, challenge.SUPPORT_ROLE(), voting);
        acl.createPermission(voting, challenge, challenge.MODIFY_PARAMETER_ROLE(), voting);

        acl.createPermission(this, contribManager, contribManager.MINT_ROLE(), this);
        acl.createPermission(this, currencyManager, currencyManager.MINT_ROLE(), this);

        contribManager.mint(root, 100000 * TOKEN_UNIT);
        currencyManager.mint(root, 100000 * TOKEN_UNIT);
        contribManager.mint(0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb, 100000*TOKEN_UNIT);
        currencyManager.mint(0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb, 100000*TOKEN_UNIT);
        contribManager.mint(0x306469457266CBBe7c0505e8Aad358622235e768, 100000*TOKEN_UNIT);
        currencyManager.mint(0x306469457266CBBe7c0505e8Aad358622235e768, 100000*TOKEN_UNIT);
        contribManager.mint(0xd873F6DC68e3057e4B7da74c6b304d0eF0B484C7, 100000*TOKEN_UNIT);
        currencyManager.mint(0xd873F6DC68e3057e4B7da74c6b304d0eF0B484C7, 100000*TOKEN_UNIT);

        acl.grantPermission(challenge, currencyManager, currencyManager.MINT_ROLE());
        acl.createPermission(challenge, currencyManager, currencyManager.BURN_ROLE(), voting);

        // Clean up permissions
        acl.grantPermission(root, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(root, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(root, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(root, acl, acl.CREATE_PERMISSIONS_ROLE());

        emit DeployDao(dao);
    }

}
