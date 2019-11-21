import 'core-js/stable'
import 'regenerator-runtime/runtime'
import AragonApi from '@aragon/api'

import { statuses, parameters } from './constants'
import { NULL_ADDRESS, EMPTY_CALLSCRIPT } from './utils'

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState, update, parameter

    switch (event.event) {
      case 'Propose':
        let proposal = await marshalProposal(parseInt(event.returnValues.id), event.returnValues.script)
        newState = {...state, proposals: [proposal].concat(state.proposals)}
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
      case 'ParameterChange':
        parameter = parameters[event.returnValues.parameterId]
        update = { [parameter]: event.returnValues.value }
        console.log(update)
        newState = {...state, ...update}
        break
      default:
        newState = state
    }

    return newState
  },
  {
    init: async function(cachedState){

      return {
        proposals: [],
        proposalStake: 0,
        proposalReward: 0,
        challengeFee: 0,
        challengeTime: 0,
        supportTime: 0,
        proposalDelay: 0,
        ...cachedState
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
