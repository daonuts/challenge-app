import 'core-js/stable'
import 'regenerator-runtime/runtime'
import AragonApi from '@aragon/api'

import { statuses } from './constants'
import { NULL_ADDRESS, EMPTY_CALLSCRIPT } from './utils'

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState, update

    switch (event.event) {
      case 'Propose':
        let proposal = await marshalProposal(parseInt(event.returnValues.id), event.returnValues.script)
        newState = {...state, proposals: [proposal].concat(state.proposals || [])}
        break
      case 'Challenge':
        newState = {...state, proposals: await updateProposal(state.proposals, parseInt(event.returnValues.id))}
        break
      case 'Support':
        newState = {...state, proposals: await updateProposal(state.proposals, parseInt(event.returnValues.id))}
        break
      case 'End':
        newState = {...state, proposals: await updateProposal(state.proposals, parseInt(event.returnValues.id))}
        break
      default:
        newState = state
    }

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

async function marshalProposal(id, script){
  const {challenger, proposer, reward, stake, end} = await api.call('proposals', id).toPromise()
  const status = await api.call('statusOf', id).toPromise()
  const description = await parseDescription(script)
  return {
    id,
    status,
    end: parseInt(end)*1000,
    proposer,
    challenger: challenger === NULL_ADDRESS ? null : challenger,
    stake,
    reward,
    script,
    description
  }
}

async function updateProposal(proposals, id){
  const {challenger, end} = await api.call('proposals', id).toPromise()
  const status = await api.call('statusOf', id).toPromise()
  const idx = proposals.findIndex(p=>p.id===id)
  proposals[idx] = {
    ...proposals[idx],
    status,
    challenger: challenger === NULL_ADDRESS ? null : challenger,
    end: parseInt(end)*1000
  }
  return proposals.slice()
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
