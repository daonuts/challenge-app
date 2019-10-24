import 'core-js/stable'
import 'regenerator-runtime/runtime'
import AragonApi from '@aragon/api'

import { statuses } from './constants'
import { NULL_ADDRESS, EMPTY_CALLSCRIPT } from './utils'

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState, proposal

    switch (event.event) {
      case 'Propose':
        proposal = await marshalProposal(parseInt(event.returnValues.id))
        newState = {...state, proposals: [proposal].concat(state.proposals || [])}
        break
      case 'Challenge':
        proposal = await marshalProposal(parseInt(event.returnValues.id))
        newState = {...state, proposals: replace(state.proposals, proposal)}
        break
      case 'Support':
        proposal = await marshalProposal(parseInt(event.returnValues.id))
        newState = {...state, proposals: replace(state.proposals, proposal)}
        break
      case 'End':
        proposal = await marshalProposal(parseInt(event.returnValues.id))
        newState = {...state, proposals: replace(state.proposals, proposal)}
        break
      case 'DEBUG':
        console.log(event.returnValues)
        newState = {...state}
        break
      default:
        newState = state
    }

    // console.log("newState challenger", newState, event)

    return newState
  },
  {
    init: async function(){
      return {
        tokenManager: await api.call('tokenManager').toPromise(),
        proposalStake: await api.call('proposalStake').toPromise(),
        proposalReward: await api.call('proposalReward').toPromise(),
        challengeFee: await api.call('challengeFee').toPromise(),
        challengeTime: await api.call('challengeTime').toPromise(),
        supportTime: await api.call('supportTime').toPromise(),
        proposalDelay: await api.call('proposalDelay').toPromise(),
        lastProposalDate: await api.call('lastProposalDate').toPromise(),
        proposalsCount: await api.call('proposalsCount').toPromise(),
      }
    }
  }
)

async function marshalProposal(id){
  const {challenger, proposer, reward, script, stake, end} = await api.call('proposals', id).toPromise()
  const status = await api.call('statusOf', id).toPromise()
  console.log(status)
  const description = await parseDescription(script)
  return {
    id,
    status: statuses[status],
    end: new Date(parseInt(end)*1000),
    proposer,
    challenger: challenger === NULL_ADDRESS ? null : challenger,
    stake,
    reward,
    script,
    description
  }
}

function replace(items, item, key = 'id'){
  let idx = items.findIndex(i=>i[key]===item[key])
  items.splice(idx, 1, item)
  return items
}

async function parseDescription(script) {
  if (!script || script === EMPTY_CALLSCRIPT) {
    return ''
  }

  console.log("script", script)
  const path = await api.describeScript(script).toPromise()
  console.log("path", path)
  const description = path
    ? path
        .map(step => {
          const identifier = step.identifier ? ` (${step.identifier})` : ''
          const app = step.name ? `${step.name}${identifier}` : `${step.to}`

          return `${app}: ${step.description || 'No description'}`
        })
        .join('\n')
    : ''

  return description
}
