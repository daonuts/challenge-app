pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
/* import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol"; */

contract Challenge is IForwarder, AragonApp {
    using SafeMath for uint;
    using SafeMath64 for uint64;

    enum Status { NONE, PROPOSED, CHALLENGED, ACCEPTED, REJECTED, ACCEPT_ENDED, REJECT_ENDED }

    struct Proposal {
      uint64  end;
      address proposer;
      address challenger;
      uint    stake;
      uint    reward;
      bytes   script;
    }

    /// Events
    event Propose(uint id);
    event Challenge(uint id);
    event Support(uint id);
    event End(uint id, bool success);

    /// State
    mapping (uint => Proposal) public proposals;
    TokenManager public tokenManager;
    uint public proposalStake;
    uint public proposalReward;
    uint public challengeFee;
    uint64 public challengeTime;
    uint64 public supportTime;
    uint64 public proposalDelay;
    uint64 public lastProposalDate;
    uint public proposalsCount;

    /// ACL
    bytes32 constant public PROPOSE_ROLE = keccak256("PROPOSE_ROLE");
    bytes32 constant public CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 constant public SUPPORT_ROLE = keccak256("SUPPORT_ROLE");
    bytes32 constant public MODIFY_PARAMETER_ROLE = keccak256("MODIFY_PARAMETER_ROLE");


    string private constant ERROR = "ERROR";
    string private constant ERROR_TIMING = "TIMING";
    string private constant ERROR_NOT_FOUND = "NOT_FOUND";
    string private constant ERROR_PERMISSION = "PERMISSION";

    function initialize(
      address _tokenManager, uint _proposalStake, uint _proposalReward, uint _challengeFee,
      uint64 _challengeTime, uint64 _supportTime, uint64 _proposalDelay
    ) public onlyInit {
        initialized();

        tokenManager = TokenManager(_tokenManager);
        proposalStake = _proposalStake;
        proposalReward = _proposalReward;
        challengeFee = _challengeFee;
        challengeTime = _challengeTime;
        supportTime = _supportTime;
        proposalDelay = _proposalDelay;
    }

    /**
     * @notice Challenge proposal:`_id`
     * @param _id Proposal id
     */
    function challenge(uint _id) external auth(CHALLENGE_ROLE) {
        Proposal storage proposal = proposals[_id];
        // require no existing challenge
        require( proposal.challenger == address(0), ERROR );
        // require in challenge period
        require( proposal.end > now, ERROR_TIMING );
        // challengeFee burn
        tokenManager.burn(msg.sender, challengeFee);
        // set challenger
        proposal.challenger = msg.sender;
        proposal.end = uint64(now).add(supportTime);

        emit Challenge(_id);
    }

    /**
     * @notice Support challenged proposal:`_id`
     * @param _id Proposal id
     */
    function support(uint _id) external auth(SUPPORT_ROLE) {
        Proposal storage proposal = proposals[_id];
        // i don't think this challenger check is necessary. if a support/accept
        // vote is initiated without a challenge and it passes early this is a way to
        // expedite approval process
        /* require( proposals[_id].challenger != address(0), ERROR ); */
        delete proposal.challenger;
        // ensure not re-challengeable
        proposal.end = 0;
        emit Support(_id);
    }

    /**
     * @notice Conclude challenged proposal:`_id`
     * @param _id Proposal id
     */
    function end(uint _id) external {
        Proposal storage proposal = proposals[_id];
        Status status = statusOf(_id);

        require(status == Status.ACCEPTED || status == Status.REJECTED, ERROR_TIMING);

        uint stake = proposal.stake;
        uint reward;
        address proposer;
        address challenger;

        if(status == Status.ACCEPTED) {
            reward = proposal.reward;
            proposer = proposal.proposer;
        } else {
            challenger = proposal.challenger;
        }

        // don't delete proposal.challenger because it's used to indicate a successful challenge
        delete proposal.end;
        delete proposal.proposer;
        delete proposal.stake;
        delete proposal.reward;

        if(status == Status.ACCEPTED) {
            // return staked amount
            /* MiniMeToken(tokenManager.token()).transfer(proposer, stake); */
            // mint reward
            tokenManager.mint(proposer, stake.add(reward));

            _execute(_id);

            emit End(_id, true);
        } else {
            // stake to challenger
            /* MiniMeToken(tokenManager.token()).transfer(challenger, stake); */
            tokenManager.mint(challenger, stake);

            delete proposal.script;

            emit End(_id, false);
        }
    }

    /**
     * @notice Get status of challenged proposal:`_id`
     * @param _id Proposal id
     */
    function statusOf(uint _id) public view returns (Status) {
        Proposal storage proposal = proposals[_id];

        if(proposal.challenger == address(0)){
            if(proposal.end > uint64(now))
                return Status.PROPOSED;
            else if(proposal.script.length > 0)
                return Status.ACCEPTED;
            else
                return Status.ACCEPT_ENDED;
        } else {
            if(proposal.end > uint64(now))
                return Status.CHALLENGED;
            else if(proposal.script.length > 0)
                return Status.REJECTED;
            else
                return Status.REJECT_ENDED;
        }
    }

    /**
     * @notice Change parameter:`_id`
     * @param _id Parameter id
     * @param _value Parameter value
     */
    function changeParameter(uint _id, uint _value) auth(MODIFY_PARAMETER_ROLE) public {
        if(_id == 1)
            proposalStake = _value;
        else if(_id == 2)
            proposalReward = _value;
        else if(_id == 3)
            challengeFee = _value;
        else if(_id == 4)
            challengeTime = uint64(_value);
        else if(_id == 5)
            supportTime = uint64(_value);
        else if(_id == 6)
            proposalDelay = uint64(_value);
    }

    function _execute(uint _id) internal {
        Proposal storage proposal = proposals[_id];

        bytes memory script = proposal.script;
        delete proposal.script;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(script, input, new address[](0));
    }

    function _propose(bytes _script, string _metadata) internal returns (uint id) {
        uint64 now64 = uint64(now);
        require( now64 >= lastProposalDate.add(proposalDelay), ERROR_TIMING );

        id = proposalsCount++;
        Proposal storage proposal = proposals[id];
        proposal.end = now64.add(challengeTime);
        proposal.proposer = msg.sender;
        proposal.stake = proposalStake;
        proposal.reward = proposalReward;
        proposal.script = _script;

        tokenManager.burn(msg.sender, proposalStake);
        lastProposalDate = now64;

        emit Propose(id);
    }

    /**
    * @notice Creates a proposal to execute the desired action
    * @dev IForwarder interface conformance
    * @param _evmScript Start proposal with script
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_PERMISSION);
        _propose(_evmScript, "");
        /* runScript(_evmScript, new bytes(0), new address[](0)); */
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        return canPerform(_sender, PROPOSE_ROLE, new uint256[](0));
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }
}
