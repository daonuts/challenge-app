import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  Bar, BackButton, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconArrowRight,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import { NONE, PROPOSED, CHALLENGED, ACCEPTED, REJECTED, ACCEPT_ENDED, REJECT_ENDED, statuses } from './constants'
const proposalComponents = {
  PROPOSED: Proposed,
  CHALLENGED: Challenged,
  ACCEPTED: Accepted,
  REJECTED: Rejected,
  ACCEPT_ENDED: AcceptEnded,
  REJECT_ENDED: RejectEnded
}

export default function App() {
  const { api, appState } = useAragonApi()
  const { proposals = [], challengeTime, syncing } = appState
  const [selected, setSelected] = useState()
  // console.log(appState)
  return (
    <Main>
      <Header primary="Challenge" />
      { selected
        ? <ProposalDetail proposal={selected} onBack={()=>setSelected()} />
        : <Proposals proposals={proposals} onSelect={setSelected} /> }
    </Main>
  )
}

function Proposals({proposals, onSelect}){
  return (
    <section>
      <h2 size="xlarge">Proposals:</h2>
      <CardLayout columnWidthMin={30 * GU} rowHeight={250}>
        {proposals.map((p)=><Proposal key={p.id} proposal={p} onSelect={onSelect} />)}
      </CardLayout>
    </section>
  )
}

function Proposal({proposal, onSelect}){
  const { api, appState } = useAragonApi()
  const [status, setStatus] = useState(proposal.status)
  useEffect(()=>{
    if([ACCEPT_ENDED, REJECT_ENDED].includes(proposal.status))
      return

    let checkStatus = setInterval(async ()=>{
      const statusId = await api.call('statusOf', proposal.id).toPromise()
      const status = statuses[statusId]
      proposal.status = status
      setStatus(status)
      if([ACCEPT_ENDED, REJECT_ENDED].includes(status))
        clearInterval(checkStatus)
    }, 10000)
  },[])

  return (
    <Card css={`
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: ${1 * GU}px;
        padding: ${3 * GU}px;
        cursor: pointer;
    `} onClick={()=>onSelect(proposal)}>
      <header style={{display: "flex", justifyContent: "space-between"}}>
        <Text color={theme.textTertiary}>#{proposal.id} </Text>
        <IconArrowRight color={theme.textTertiary} />
      </header>
      <section>
        <Text>{proposal.description}</Text>
        <Text>{proposal.status}</Text>
        <Text>{proposal.end.getTime()}</Text>
      </section>
      {proposalState({status,proposal})}
    </Card>
  )
}

function proposalState({status, proposal}){
  switch(status){
    case PROPOSED:
      return <Proposed {...proposal} />
    case CHALLENGED:
      return <Challenged {...proposal} />
    case ACCEPTED:
      return <Accepted {...proposal} />
    case REJECTED:
      return <Rejected {...proposal} />
    case ACCEPT_ENDED:
      return <AcceptEnded {...proposal} />
    case REJECT_ENDED:
      return <RejectEnded {...proposal} />
  }
}
// <Dynamic {...proposal} />

function ProposalDetail({proposal, onBack}){
  const { api, appState } = useAragonApi()
  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <section>
        {proposal.description}
      </section>
    </React.Fragment>
  )
}

function Proposed({id}){
  const { api, appState } = useAragonApi()
  return (
    <React.Fragment>
      <Field>
        <Button onClick={(e)=>{e.stopPropagation();api.challenge(id).toPromise();}} mode="strong" emphasis="negative">Challenge</Button>
      </Field>
    </React.Fragment>
  )
}

function Challenged({id}){
  const { api, appState } = useAragonApi()
  return (
    <React.Fragment>
      <Field>
        <Button onClick={(e)=>{e.stopPropagation();api.support(id).toPromise();}} mode="strong" emphasis="positive">Support</Button>
      </Field>
    </React.Fragment>
  )
}

function Accepted({id, proposer, reward}){
  const { api, appState, connectedAccount } = useAragonApi()
  return (
    <React.Fragment>
      {connectedAccount === proposer &&
        <Info.Action style={{"marginBottom": "10px"}}>{`You can claim ${BigNumber(reward).div("1e+18")}`}</Info.Action>
      }
      <Field>
        <Button onClick={(e)=>{e.stopPropagation();api.end(id).toPromise();}} mode="strong" emphasis="positive">End</Button>
      </Field>
    </React.Fragment>
  )
}

function Rejected({id, challenger, stake}) {
  const { api, appState, connectedAccount } = useAragonApi()
  return (
    <React.Fragment>
      {connectedAccount === challenger &&
        <Info.Action style={{"marginBottom": "10px"}}>{`You can claim ${BigNumber(stake).div("1e+18")}`}</Info.Action>
      }
      <Field>
        <Button onClick={(e)=>{e.stopPropagation();api.end(id).toPromise();}} mode="strong" emphasis="positive">End</Button>
      </Field>
    </React.Fragment>
  )
}

function AcceptEnded() {
  return (
    <React.Fragment>
      <Info style={{"marginBottom": "10px"}}>{`Proposal ended accepted`}</Info>
    </React.Fragment>
  )
}

function RejectEnded() {
  return (
    <React.Fragment>
      <Info.Alert style={{"marginBottom": "10px"}}>{`Proposal ended rejected`}</Info.Alert>
    </React.Fragment>
  )
}

export function Welcome({username}) {
  return (
    <div>
      <Text.Block style={{ textAlign: 'center' }} size='large'>welcome, </Text.Block>
      <Text.Block style={{ textAlign: 'center' }} size='xxlarge'>{username}</Text.Block>
    </div>
  )
}
