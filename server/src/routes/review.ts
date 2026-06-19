import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { reviewService } from '../services/review.service.js';
import { success, fail } from '../utils/response.js';

export const reviewRouter = Router();

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: 创建评价
 *     description: 订单完成后，参与方可对另一方评价（1-5 星）
 */
reviewRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId, rating, content } = req.body;
    if (!orderId || !rating) {
      return fail(res, '请提供订单 ID 和评分', 400);
    }
    const review = await reviewService.create({
      orderId,
      reviewerId: req.user!.userId,
      rating: Number(rating),
      content,
    });
    success(res, review, '评价成功');
  } catch (e: any) {
    fail(res, e.message || '评价失败', e.status || 500);
  }
});

/**
 * @openapi
 * /api/reviews/order/:orderId:
 *   get:
 *     tags: [Reviews]
 *     summary: 获取订单评价
 */
reviewRouter.get('/order/:orderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const review = await reviewService.getByOrder(req.params.orderId!, req.user!.userId);
    success(res, review);
  } catch (e: any) {
    fail(res, e.message || '获取失败', e.status || 500);
  }
});

/**
 * @openapi
 * /api/reviews/user/:userId:
 *   get:
 *     tags: [Reviews]
 *     summary: 获取用户评价列表
 */
reviewRouter.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await reviewService.getByUser(req.params.userId!, page);
    res.json({
      success: true,
      data: {
        items: result.reviews,
        page: result.page,
        limit: 20,
        total: result.total,
        totalPages: result.totalPages,
        avgRating: result.avgRating,
      },
    });
  } catch (e: any) {
    fail(res, e.message || '获取失败', e.status || 500);
  }
});
