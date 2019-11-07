# challenge

## Overview

The challenge app restricts Aragon dao actions to be taken only once vetted through a challenge period.

- `PROPOSE_ROLE`
  - may create challenge-able actions. there is no way to directly do this - only via the Aragon permission forwarding system. ie. the challenge app is used to fill roles in other apps.
  - proposals are made along with a `proposalStake` and rate limited by `proposalDelay`.
  - unchallenged proposals can be enacted after `challengeTime`
  - `Propose` event is fired
- `CHALLENGE_ROLE`
  - may challenge proposed actions.
  - challenges are made along with a `challengeFee` which is burned
  - unsupported challenges are successful (proposal defeated) after `supportTime`
  - `Challenge` event is fired
- `SUPPORT_ROLE`
  - may overcome a challenged proposal (proposal is accepted and not re-challenge-able)
  - this role might be assigned to be the voting app (so only a dao vote can overcome a challenged proposal)
  - does not automatically enact the proposal (see Ending proposals)
  - `Support` event is fired
- `MODIFY_PARAMETER_ROLE` can modify any of the following app parameters:
  - `proposalStake`
  - `proposalReward`
  - `challengeFee`
  - `challengeTime`
  - `supportTime`
  - `proposalDelay`

#### Ending proposals

All proposals require a final step to conclude and this is taken by calling the `end` method. This method settles balances for proposer and any potential challenger, moving `proposalStake` to the challenger for successful challenges, `proposalStake + proposalReward` to the proposer for successful proposals, and executing the proposal action. Currently the proposal script is also deleted once enacted to save transaction gas though this has the side affect of removing the possibility to view past proposals (maybe the proposal script should be added to the `Propose` event?). The `end` method also emits the `End` event.


## Donuts specific parameter values

- initially `PROPOSE_ROLE` would be restricted to mods
- initially `MODIFY_PARAMETER_ROLE` would be restricted to u/carlslarson
- `CHALLENGE_ROLE` will be restricted to any holder of locked (earned/non-transferable) donuts
- `SUPPORT_ROLE` will be the voting app
- `proposalStake` - 100k donuts
- `proposalReward` - 10k donuts
- `challengeFee` - 50k donuts
- `challengeTime` - 1 week
- `supportTime` - 2 weeks
- `proposalDelay` - 1 hour
