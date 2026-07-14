import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { fail, success } from '../utils/response.js';
import { searchDemands } from '../services/agent/demand-search.js';
import { serviceCardService } from '../services/service-card.service.js';

export const cardSearchRouter = Router();

cardSearchRouter.get('/cards', authMiddleware, async (req: Request, res: Response) => {
  try {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const identity = req.query.identity === 'PROVIDER' ? 'PROVIDER' : 'DEMANDER';
    if (!keyword) return success(res, { items: [], identity });

    const [demands, services] = await Promise.all([
      searchDemands({ keyword, limit: 50 }, { limitMax: 50 }),
      serviceCardService.search({ keyword, limit: 50 }),
    ]);
    const demandItems = demands.map((demand) => ({
      resultType: 'DEMAND' as const,
      ...demand,
    }));
    const serviceItems = services.map((service) => ({
      resultType: 'SERVICE_CARD' as const,
      ...service,
    }));
    const items = identity === 'PROVIDER'
      ? [...demandItems, ...serviceItems]
      : [...serviceItems, ...demandItems];
    return success(res, { items, identity });
  } catch (error: any) {
    return fail(res, error?.message || '卡片检索失败', error?.status || 500);
  }
});
