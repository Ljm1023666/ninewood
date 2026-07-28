import api from './index'

export type ActiveResourceType = 'ORDER' | 'LOOP_RUN' | 'DEMAND' | 'AGENT_TASK'

export const outcomeApi = {
  recordActiveTime(resourceType: ActiveResourceType, resourceId: string, activeMs: number) {
    return api.post('/outcomes/active-time', { resourceType, resourceId, activeMs })
  },
}
