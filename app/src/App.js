import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  Bar, BackButton, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconArrowRight,
  Info, Main, Modal, SidePanel, Text, TextInput, Timer, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import { NONE, PROPOSED, CHALLENGED, ACCEPTED, REJECTED, ACCEPT_ENDED, REJECT_ENDED, statuses } from './constants'

export default function App() {
  const { api, appState } = useAragonApi()
  const { proposals = [], challengeTime, syncing } = appState
  const [selectedId, setSelectedId] = useState()
  // console.log(appState)
  return (
    <Main>
      <Header primary="Challenge" />
      { selectedId
        ? <ProposalDetail {...proposals.find(p=>p.id===selectedId)} onBack={()=>setSelectedId()} />
        : <Proposals proposals={proposals} onSelect={setSelectedId} /> }
    </Main>
  )
}

function Proposals({proposals, onSelect}){
  return (
    <section>
      <h2 size="xlarge">Proposals:</h2>
      <CardLayout columnWidthMin={30 * GU} rowHeight={250}>
        {proposals.map((p)=><Proposal key={p.id} {...p} onSelect={onSelect} />)}
      </CardLayout>
    </section>
  )
}

function Proposal({id, description, end, status, proposer, challenger, stake, reward, onSelect}){
  const { api, appState } = useAragonApi()
  // const [status, setStatus] = useState(proposal.status)
  // useEffect(()=>{
  //   if([ACCEPT_ENDED, REJECT_ENDED].includes(proposal.status))
  //     return
  //
  //   let checkStatus = setInterval(async ()=>{
  //     const statusId = await api.call('statusOf', proposal.id).toPromise()
  //     const status = statuses[statusId]
  //     proposal.status = status
  //     setStatus(status)
  //     if([ACCEPT_ENDED, REJECT_ENDED].includes(status))
  //       clearInterval(checkStatus)
  //   }, 10000)
  // },[])
  console.log("status", status)

  return (
    <Card css={`
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: ${1 * GU}px;
        padding: ${3 * GU}px;
        cursor: pointer;
        align-items: start;
    `} onClick={()=>onSelect(id)}>
      <header style={{display: "flex", justifyContent: "space-between"}}>
        <Text color={theme.textTertiary}>#{id}</Text>
        <Timer end={new Date(end)} />
        <IconArrowRight color={theme.textTertiary} />
      </header>
      <section>
        <Text>{description}</Text>
      </section>
      {proposalState(status, id, proposer, reward, challenger, stake)}
    </Card>
  )
}

function proposalState(status, id, proposer, reward, challenger, stake){
  switch(statuses[status]){
    case PROPOSED:
      return <Proposed id={id} />
    case CHALLENGED:
      return <Challenged id={id} />
    case ACCEPTED:
      return <Accepted id={id} proposer={proposer} reward={reward} />
    case REJECTED:
      return <Rejected id={id} challenger={challenger} stake={stake} />
    case ACCEPT_ENDED:
      return <AcceptEnded />
    case REJECT_ENDED:
      return <RejectEnded />
  }
}

function ProposalDetail({description, onBack}){
  const { api, appState } = useAragonApi()
  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <section>
        {description}
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
