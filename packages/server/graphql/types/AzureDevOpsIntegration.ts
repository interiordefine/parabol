import {GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType} from 'graphql'
import AzureDevOpsServerManager from '../../utils/AzureDevOpsServerManager'
import {getUserId} from '../../utils/authorization'
import standardError from '../../utils/standardError'
import {GQLContext} from '../graphql'
import connectionFromTasks from '../queries/helpers/connectionFromTasks'
import {AzureDevOpsIssueConnection} from './AzureDevOpsWorkItem'
import GraphQLISO8601Type from './GraphQLISO8601Type'
import IntegrationProviderOAuth2 from './IntegrationProviderOAuth2'
import TeamMemberIntegrationAuthOAuth2 from './TeamMemberIntegrationAuthOAuth2'

type IntegrationProviderServiceEnum = 'azureDevOps' | 'gitlab' | 'jiraServer' | 'mattermost'

type WorkItemArgs = {
  first: number
  after?: string
}

interface IGetAzureDevOpsAuthByUserIdTeamIdQueryResult {
  createdAt: Date
  updatedAt: Date
  teamId: string
  userId: string
  providerId: number
  service: IntegrationProviderServiceEnum
  isActive: boolean
  accessToken: string | null
  refreshToken: string | null
  scopes: string | null
  accessTokenSecret: string | null
  // Note: instanceIds does not belong here, in fact this type as a whole should be removed eventually
  instanceIds: string[]
}

interface AzureDevOpsAuth
  extends Omit<IGetAzureDevOpsAuthByUserIdTeamIdQueryResult, 'azureDevOpsSearchQueries'> {
  azureDevOpsSearchQueries: {
    id: string
    queryString: string
    projectKeyFilters?: string[]
    lastUsedAt: Date
    isWIQL: boolean
  }[]
}

const AzureDevOpsIntegration = new GraphQLObjectType<any, GQLContext>({
  name: 'AzureDevOpsIntegration',
  description: 'The Azure DevOps auth + integration helpers for a specific team member',
  fields: () => ({
    auth: {
      description: 'The OAuth2 Authorization for this team member',
      type: TeamMemberIntegrationAuthOAuth2,
      resolve: async (
        {teamId, userId}: {teamId: string; userId: string},
        _args: unknown,
        {dataLoader}
      ) => {
        return dataLoader
          .get('teamMemberIntegrationAuths')
          .load({service: 'azureDevOps', teamId, userId})
      }
    },
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'Composite key in ado:teamId:userId format',
      resolve: ({teamId, userId}: {teamId: string; userId: string}) => `ado:${teamId}:${userId}`
    },
    isActive: {
      description: 'true if the auth is valid, else false',
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve: ({accessToken}) => !!accessToken
    },
    accessToken: {
      description:
        'The access token to Azure DevOps. null if no access token available or the viewer is not the user',
      type: GraphQLID
      // Add resolver
    },
    accountId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The Azure DevOps account ID'
    },
    instanceIds: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
      description: 'The Azure DevOps instance IDs that the user has granted'
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type),
      description: 'The timestamp the provider was created'
    },
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The team that the token is linked to'
    },
    updatedAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type),
      description: 'The timestamp the token was updated at'
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The user that the access token is attached to'
    },
    userStories: {
      type: new GraphQLNonNull(AzureDevOpsIssueConnection),
      description:
        'A list of work items coming straight from the azure dev ops integration for a specific team member',
      args: {
        first: {
          type: GraphQLInt,
          defaultValue: 100
        },
        after: {
          type: GraphQLISO8601Type,
          description: 'the datetime cursor'
        }
      },
      resolve: async (
        {teamId, userId}: AzureDevOpsAuth,
        args: any,
        {authToken, dataLoader}: GQLContext
      ) => {
        const {first} = args as WorkItemArgs
        const viewerId = getUserId(authToken)
        if (viewerId !== userId) {
          const err = new Error('Cannot access another team members issues')
          standardError(err, {tags: {teamId, userId}, userId: viewerId})
          return connectionFromTasks([], 0, err)
        }
        const auth = await dataLoader.get('freshAzureDevOpsAuth').load({teamId, userId})
        const {accessToken} = auth
        const manager = new AzureDevOpsServerManager(accessToken)
        const restResult = await manager.getAllUserWorkItems()
        const {error, workItems: innerWorkItems} = restResult
        if (error !== undefined) {
          console.log(error)
          standardError(error, {tags: {teamId, userId}, userId: viewerId})
          return connectionFromTasks([], 0, error)
        }
        if (innerWorkItems === undefined) {
          return connectionFromTasks([], 0, undefined)
        } else {
          const userStories = Array.from(
            innerWorkItems.map((workItem) => {
              return {
                id: workItem.id.toString(),
                url: workItem.url,
                state: workItem.fields['System.State'],
                type: workItem.fields['System.WorkItemType'],
                updatedAt: new Date()
              }
            })
          )
          return connectionFromTasks(
            userStories,
            first,
            undefined
          )
        }
      }
    },
    cloudProvider: {
      description:
        'The cloud provider the team member may choose to integrate with. Nullable based on env vars',
      type: IntegrationProviderOAuth2,
      resolve: async (_source: unknown, _args: unknown, {dataLoader}) => {
        console.log('hey there')
        const [globalProvider] = await dataLoader
          .get('sharedIntegrationProviders')
          .load({service: 'azureDevOps', orgTeamIds: ['aGhostTeam'], teamIds: []})
        console.log(globalProvider)

        return globalProvider
      }
    },
    sharedProviders: {
      description: 'The non-global providers shared with the team or organization',
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(IntegrationProviderOAuth2))),
      resolve: async ({teamId}: {teamId: string}, _args: unknown, {dataLoader}) => {
        const team = await dataLoader.get('teams').loadNonNull(teamId)
        const {orgId} = team
        const orgTeams = await dataLoader.get('teamsByOrgIds').load(orgId)
        const orgTeamIds = orgTeams.map(({id}) => id)
        return dataLoader
          .get('sharedIntegrationProviders')
          .load({service: 'azureDevOps', orgTeamIds, teamIds: [teamId]})
      }
    }
  })
})

export default AzureDevOpsIntegration
