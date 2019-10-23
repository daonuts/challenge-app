import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconArrowRight,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import { NONE, PROPOSED, CHALLENGED, ACCEPTED, REJECTED, ACCEPT_ENDED, REJECT_ENDED} from './constants'
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
  const { proposals = [], syncing } = appState
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
        {proposals.map((p, i)=><Proposal proposal={proposal} onSelect={onSelect} />)}
      </CardLayout>
    </section>
  )
}

function Proposal({proposal, onSelect}){
  let Dynamic = proposalComponents[proposal.status]
  const [opened, setOpened] = useState(false)
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
        <Text>{proposal.description}</Text>
        <IconArrowRight color={theme.textTertiary} />
      </header>
      <section>
        <Text>{proposal.status}</Text>
        <Dynamic {...proposal} />
      </section>
      <footer style={{display: "flex", justifyContent: "flex-end"}}>
        {!awarded && userData &&
        <Button mode="strong" emphasis="positive" onClick={(e)=>{e.stopPropagation();api.award(id, connectedAccount, userData.amount, userData.proof).toPromise()}}>Claim</Button>}
      </footer>
    </Card>
  )
}

function ProposalDetail({proposal, onBack}){
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
        <Button onClick={() => api.challenge(id)} mode="strong" emphasis="negative">Challenge</Button>
      </Field>
    </React.Fragment>
  )
}

function Challenged({id}){
  const { api, appState } = useAragonApi()
  return (
    <React.Fragment>
      <Field>
        <Button onClick={() => api.support(id)} mode="strong" emphasis="positive">Support</Button>
      </Field>
    </React.Fragment>
  )
}

function Accepted({id, proposer, reward}){
  const { api, appState, connectedAccount } = useAragonApi()
  return (
    <React.Fragment>
      {connectedAccount === proposer &&
        <Info.Action style={{"margin-bottom": "10px"}}>You can claim {BigNumber(reward).div("1e+18")}</Info.Action>
      }
      <Field>
        <Button onClick={() => api.end(id)} mode="strong" emphasis="positive">End</Button>
      </Field>
    </React.Fragment>
  )
}

function Rejected({id, challenger, stake}) {
  const { api, appState, connectedAccount } = useAragonApi()
  return (
    <React.Fragment>
      {connectedAccount === challenger &&
        <Info.Action style={{"margin-bottom": "10px"}}>You can claim {BigNumber(stake).div("1e+18")}</Info.Action>
      }
      <Field>
        <Button onClick={() => api.end(id)} mode="strong" emphasis="positive">End</Button>
      </Field>
    </React.Fragment>
  )
}

function AcceptEnded() {
  return (
    <React.Fragment>
      <Info style={{"margin-bottom": "10px"}}>Proposal ended accepted</Info>
    </React.Fragment>
  )
}

function RejectEnded() {
  return (
    <React.Fragment>
      <Info.Alert style={{"margin-bottom": "10px"}}>Proposal ended rejected</Info.Alert>
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
