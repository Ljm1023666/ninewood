import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { fail } from '../utils/response.js';

type Source = 'body' | 'query' | 'params';

/**
 * 通用请求校验中间件
 * 用法：router.post('/path', validate(schema), handler)
 *       router.get('/path', validate(querySchema, 'query'), handler)
 */
export function validate<T>(schema: ZodSchema<T>, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return fail(res, '输入验证失败', 400, result.error.errors);
    }
    // 用校验后的数据覆盖原始数据
    if (source === 'body') req.body = result.data;
    else if (source === 'query') (req as any).validatedQuery = result.data;
    else if (source === 'params') (req as any).validatedParams = result.data;
    next();
  };
}
