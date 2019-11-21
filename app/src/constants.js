let NONE = 'NONE'
let PROPOSED = 'PROPOSED'
let CHALLENGED = 'CHALLENGED'
let ACCEPTED = 'ACCEPTED'
let REJECTED = 'REJECTED'
let ACCEPT_ENDED = 'ACCEPT_ENDED'
let REJECT_ENDED = 'REJECT_ENDED'
let statuses = [NONE, PROPOSED, CHALLENGED, ACCEPTED, REJECTED, ACCEPT_ENDED, REJECT_ENDED]
let parameters = [null, "proposalStake", "proposalReward", "challengeFee", "challengeTime", "supportTime", "proposalDelay"]

export {
  NONE,
  PROPOSED,
  CHALLENGED,
  ACCEPTED,
  REJECTED,
  ACCEPT_ENDED,
  REJECT_ENDED,
  statuses,
  parameters
}
