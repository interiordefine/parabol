import React from 'react'
import styled from '@emotion/styled'
import {createFragmentContainer} from 'react-relay'
import graphql from 'babel-plugin-relay/macro'
import {AssignFacilitator_team} from '../__generated__/AssignFacilitator_team.graphql'
import {MenuPosition} from '../hooks/useCoords'
import useMenu from '../hooks/useMenu'
import {PortalStatus} from '../hooks/usePortal'
import lazyPreload from '../utils/lazyPreload'
import isDemoRoute from '../utils/isDemoRoute'
import {PALETTE} from '../styles/paletteV2'
import Icon from './Icon'

const AssignFacilitatorBlock = styled('div')({
  borderBottom: `1px solid ${PALETTE.BORDER_LIGHTER}`,
  fontWeight: 700,
  marginBottom: 8,
  padding: '0 8px 8px'
})

const AssignFacilitatorToggle = styled('div')<{isActive: boolean, isReadOnly: boolean}>(({isActive, isReadOnly}) => ({
  alignItems: 'center',
  cursor: isReadOnly ? undefined : 'pointer',
  display: 'flex',
  // padding compensates for 8px grid, hanging elements
  // icons and other decorators can be on a 4px grid, anyway, per MD spec
  // total height = 40px like nav elements, and AssignFacilitatorBlock and SidebarHeader (NewMeetingSidebar.tsx) add 8px gutter
  padding: '2px 4px',
  // StyledIcon when toggle isActive or not
  '& > i': {
    backgroundColor: isActive ? PALETTE.BACKGROUND_MAIN : undefined,
    color: isActive ? PALETTE.TEXT_MAIN : PALETTE.TEXT_GRAY
  },
  // StyledIcon when toggle hovered
  '&:hover > i': {
    backgroundColor: PALETTE.BACKGROUND_MAIN,
    color: PALETTE.TEXT_MAIN
  }
}))

const Label = styled('div')({
  color: PALETTE.TEXT_MAIN,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '20px'
})

const Subtext = styled('div')({
  color: PALETTE.TEXT_GRAY,
  fontSize: 11,
  fontWeight: 400,
  lineHeight: '16px'
})

const StyledIcon = styled(Icon)({
  borderRadius: 32,
  height: 32,
  lineHeight: '32px',
  marginLeft: 'auto',
  textAlign: 'center',
  width: 32
})

const AvatarBlock = styled('div')<{isConnected: boolean | null}>(({isConnected}) => ({
  border: '2px solid',
  borderColor: isConnected ? PALETTE.TEXT_GREEN : PALETTE.TEXT_GRAY,
  borderRadius: 30,
  height: 30,
  marginLeft: 1,
  marginRight: 13,
  width: 30
}))

const Avatar = styled('img')({
  border: '1px solid #FFFFFF',
  borderRadius: 26,
  height: 26,
  width: 26
})

interface Props {
  team: AssignFacilitator_team
}

const AssignFacilitatorMenu = lazyPreload(() =>
  import(/* webpackChunkName: 'AssignFacilitatorMenu' */
  './AssignFacilitatorMenu')
)

const AssignFacilitator = (props: Props) => {
  const {team} = props
  const {newMeeting, teamMembers} = team
  const {facilitator} = newMeeting!
  const {picture, preferredName, user: {isConnected}} = facilitator
  const {togglePortal, menuProps, menuPortal, originRef, portalStatus} = useMenu<HTMLDivElement>(MenuPosition.UPPER_RIGHT, {
    isDropdown: true
  })
  const isReadOnly = isDemoRoute() || teamMembers.length === 1
  const handleOnMouseEnter = () => !isReadOnly && AssignFacilitatorMenu.preload()
  const handleOnClick = () => !isReadOnly && togglePortal()
  return (
    <AssignFacilitatorBlock>
      <AssignFacilitatorToggle
        isActive={portalStatus === PortalStatus.Entering || portalStatus === PortalStatus.Entered}
        isReadOnly={isReadOnly}
        onClick={handleOnClick}
        onMouseEnter={handleOnMouseEnter}
        ref={originRef}
      >
        <AvatarBlock isConnected={isConnected}>
          <Avatar alt='' src={picture} />
        </AvatarBlock>
        <div>
          <Label>Faciltator</Label>
          <Subtext>{preferredName}</Subtext>
        </div>
        {!isReadOnly && <StyledIcon>keyboard_arrow_down</StyledIcon>}
      </AssignFacilitatorToggle>
      {menuPortal(<AssignFacilitatorMenu menuProps={menuProps} team={team} />)}
    </AssignFacilitatorBlock>
  )
}

export default createFragmentContainer(AssignFacilitator, {
  team: graphql`
    fragment AssignFacilitator_team on Team {
      ...AssignFacilitatorMenu_team
      teamMembers(sortBy: "checkInOrder") {
        id
      }
      newMeeting {
        facilitator {
          picture
          preferredName
          user {
            isConnected
          }
        }
      }
    }
  `
})
