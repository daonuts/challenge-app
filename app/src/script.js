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
        proposal = await marshalProposal(parseInt(event.returnValues.id, 10))
        newState = {...state, proposals: [proposal].concat(state.proposals || [])}
        break
      case 'Challenge':
        proposal = await marshalProposal(parseInt(event.returnValues.id, 10))
        newState = {...state, proposals: replace(state.proposals, proposal)}
        break
      case 'Support':
        proposal = await marshalProposal(parseInt(event.returnValues.id, 10))
        newState = {...state, proposals: replace(state.proposals, proposal)}
        break
      case 'End':
        proposal = await marshalProposal(parseInt(event.returnValues.id, 10))
        newState = {...state, proposals: replace(state.proposals, proposal)}
        break
      default:
        newState = state
    }

    // console.log("newState challenger", newState, event)

    return newState
  },
  {
    init: async function(){
      return {}
    }
  }
)

async function marshalProposal(id){
  const {challenger, proposer, reward, script, stake, timer} = await api.call('proposals', id).toPromise()
  const status = await api.call('statusOf', id).toPromise()
  const description = await parseDescription(script)
  return {
    id,
    status: statuses[status],
    timer: new Date(parseInt(timer, 10)*1000),
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
