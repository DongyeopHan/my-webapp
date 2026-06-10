import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import ShoppingPrice from '../models/ShoppingPrice.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 장보기 시세는 사용자별 분리가 아닌 전역 공유 데이터로 운영한다.

const DEFAULT_MARKET_ROWS = [
  { product: '계란', unit: '30구', martName: '농협', price: 8900 },
  { product: '계란', unit: '30구', martName: '노브랜드', price: 8600 },
  { product: '계란', unit: '30구', martName: '킴스클럽', price: 9100 },
  { product: '우유', unit: '1L', martName: '농협', price: 2950 },
  { product: '우유', unit: '1L', martName: '노브랜드', price: 2790 },
  { product: '우유', unit: '1L', martName: '킴스클럽', price: 3050 },
  { product: '양파', unit: '1kg', martName: '농협', price: 3600 },
  { product: '양파', unit: '1kg', martName: '노브랜드', price: 3290 },
  { product: '양파', unit: '1kg', martName: '킴스클럽', price: 3800 },
  { product: '두부', unit: '300g', martName: '농협', price: 1900 },
  { product: '두부', unit: '300g', martName: '노브랜드', price: 1690 },
  { product: '두부', unit: '300g', martName: '킴스클럽', price: 1990 },
];

const ensureDefaultRows = async () => {
  const count = await ShoppingPrice.countDocuments();
  if (count > 0) {
    return;
  }

  await ShoppingPrice.insertMany(
    DEFAULT_MARKET_ROWS.map((row) => ({
      ...row,
      source: 'seed' as const,
    })),
  );
};

type GroupedShoppingPrice = {
  product: string;
  unit: string;
  prices: Array<{
    id: string;
    martName: string;
    price: number;
    source: 'seed' | 'user';
    updatedAt: Date;
  }>;
};

const toGroupedResponse = (rows: Array<any>): GroupedShoppingPrice[] => {
  const grouped = new Map<string, GroupedShoppingPrice>();

  for (const row of rows) {
    const key = `${row.product}__${row.unit}`;

    const current: GroupedShoppingPrice = grouped.get(key) ?? {
      product: row.product,
      unit: row.unit,
      prices: [],
    };

    current.prices.push({
      id: String(row._id),
      martName: row.martName,
      price: row.price,
      source: row.source,
      updatedAt: row.updatedAt,
    });

    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      prices: item.prices.sort((a, b) => a.price - b.price),
    }))
    .sort((a, b) => a.product.localeCompare(b.product, 'ko-KR'));
};

router.get('/prices', authenticate, async (_req: Request, res: Response) => {
  try {
    await ensureDefaultRows();

    const rows = await ShoppingPrice.find().sort({
      product: 1,
      unit: 1,
      price: 1,
      updatedAt: -1,
    });

    return res.json({ items: toGroupedResponse(rows) });
  } catch (error) {
    console.error('Get shopping prices error:', error);
    return res
      .status(500)
      .json({ message: '장보기 시세 조회 중 오류가 발생했습니다' });
  }
});

router.post('/prices', authenticate, async (req: Request, res: Response) => {
  try {
    const { product, unit, martName, price } = req.body;

    const normalizedProduct = String(product ?? '').trim();
    const normalizedUnit = String(unit ?? '').trim();
    const normalizedMartName = String(martName ?? '').trim();
    const parsedPrice = Number(price);

    if (!normalizedProduct || !normalizedUnit || !normalizedMartName) {
      return res.status(400).json({
        message: '품목명, 단위, 마트명은 필수입니다',
      });
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        message: '가격은 0보다 큰 숫자여야 합니다',
      });
    }

    const created = await ShoppingPrice.create({
      product: normalizedProduct,
      unit: normalizedUnit,
      martName: normalizedMartName,
      price: parsedPrice,
      source: 'user',
    });

    return res.status(201).json({
      item: {
        id: String(created._id),
        product: created.product,
        unit: created.unit,
        martName: created.martName,
        price: created.price,
        source: created.source,
        updatedAt: created.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create shopping price error:', error);
    return res
      .status(500)
      .json({ message: '장보기 시세 등록 중 오류가 발생했습니다' });
  }
});

router.post('/items', authenticate, async (req: Request, res: Response) => {
  try {
    const { product, unit } = req.body;

    const normalizedProduct = String(product ?? '').trim();
    const normalizedUnit = String(unit ?? '').trim();

    if (!normalizedProduct || !normalizedUnit) {
      return res.status(400).json({
        message: '품목명과 단위는 필수입니다',
      });
    }

    const exists = await ShoppingPrice.exists({
      product: normalizedProduct,
      unit: normalizedUnit,
    });

    if (exists) {
      return res.status(409).json({ message: '이미 존재하는 품목/단위입니다' });
    }

    const created = await ShoppingPrice.create({
      product: normalizedProduct,
      unit: normalizedUnit,
      martName: '미정',
      price: 0,
      source: 'user',
    });

    return res.status(201).json({
      item: {
        id: String(created._id),
        product: created.product,
        unit: created.unit,
        martName: created.martName,
        price: created.price,
        source: created.source,
        updatedAt: created.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create shopping item error:', error);
    return res
      .status(500)
      .json({ message: '품목 생성 중 오류가 발생했습니다' });
  }
});

router.patch('/items', authenticate, async (req: Request, res: Response) => {
  try {
    const { product, unit, nextProduct, nextUnit } = req.body;

    const normalizedProduct = String(product ?? '').trim();
    const normalizedUnit = String(unit ?? '').trim();
    const normalizedNextProduct = String(nextProduct ?? '').trim();
    const normalizedNextUnit = String(nextUnit ?? '').trim();

    if (!normalizedProduct || !normalizedUnit) {
      return res
        .status(400)
        .json({ message: '기존 품목명과 단위는 필수입니다' });
    }

    if (!normalizedNextProduct || !normalizedNextUnit) {
      return res
        .status(400)
        .json({ message: '변경할 품목명과 단위는 필수입니다' });
    }

    const updated = await ShoppingPrice.updateMany(
      {
        product: normalizedProduct,
        unit: normalizedUnit,
      },
      {
        $set: {
          product: normalizedNextProduct,
          unit: normalizedNextUnit,
        },
      },
    );

    if (updated.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: '수정할 품목을 찾을 수 없습니다' });
    }

    return res.json({
      message: '품목 정보가 수정되었습니다',
      updatedCount: updated.modifiedCount,
      product: normalizedNextProduct,
      unit: normalizedNextUnit,
    });
  } catch (error) {
    console.error('Update shopping item error:', error);
    return res
      .status(500)
      .json({ message: '품목 수정 중 오류가 발생했습니다' });
  }
});

router.patch(
  '/prices/:priceId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const rawPriceId = req.params.priceId;
      const priceId = Array.isArray(rawPriceId) ? rawPriceId[0] : rawPriceId;
      const { martName, price } = req.body;

      if (!priceId || !mongoose.Types.ObjectId.isValid(priceId)) {
        return res.status(400).json({ message: '잘못된 시세 ID입니다' });
      }

      const updatePayload: { martName?: string; price?: number } = {};

      if (martName !== undefined) {
        const normalizedMartName = String(martName).trim();
        if (!normalizedMartName) {
          return res
            .status(400)
            .json({ message: '마트명은 비워둘 수 없습니다' });
        }
        updatePayload.martName = normalizedMartName;
      }

      if (price !== undefined) {
        const parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          return res
            .status(400)
            .json({ message: '가격은 0보다 큰 숫자여야 합니다' });
        }
        updatePayload.price = parsedPrice;
      }

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ message: '수정할 값이 없습니다' });
      }

      const updated = await ShoppingPrice.findByIdAndUpdate(
        priceId,
        updatePayload,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updated) {
        return res
          .status(404)
          .json({ message: '시세 항목을 찾을 수 없습니다' });
      }

      return res.json({
        item: {
          id: String(updated._id),
          product: updated.product,
          unit: updated.unit,
          martName: updated.martName,
          price: updated.price,
          source: updated.source,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      console.error('Update shopping price error:', error);
      return res
        .status(500)
        .json({ message: '장보기 시세 수정 중 오류가 발생했습니다' });
    }
  },
);

router.delete(
  '/prices/:priceId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const rawPriceId = req.params.priceId;
      const priceId = Array.isArray(rawPriceId) ? rawPriceId[0] : rawPriceId;

      if (!priceId || !mongoose.Types.ObjectId.isValid(priceId)) {
        return res.status(400).json({ message: '잘못된 시세 ID입니다' });
      }

      const deleted = await ShoppingPrice.findByIdAndDelete(priceId);

      if (!deleted) {
        return res
          .status(404)
          .json({ message: '시세 항목을 찾을 수 없습니다' });
      }

      return res.json({
        message: '시세 항목이 삭제되었습니다',
        deletedId: priceId,
      });
    } catch (error) {
      console.error('Delete shopping price error:', error);
      return res
        .status(500)
        .json({ message: '장보기 시세 삭제 중 오류가 발생했습니다' });
    }
  },
);

router.delete('/items', authenticate, async (req: Request, res: Response) => {
  try {
    const { product, unit } = req.body;

    const normalizedProduct = String(product ?? '').trim();
    const normalizedUnit = String(unit ?? '').trim();

    if (!normalizedProduct || !normalizedUnit) {
      return res.status(400).json({ message: '품목명과 단위는 필수입니다' });
    }

    const deleted = await ShoppingPrice.deleteMany({
      product: normalizedProduct,
      unit: normalizedUnit,
    });

    if (deleted.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: '삭제할 품목을 찾을 수 없습니다' });
    }

    return res.json({
      message: '품목이 삭제되었습니다',
      deletedCount: deleted.deletedCount,
    });
  } catch (error) {
    console.error('Delete shopping item error:', error);
    return res
      .status(500)
      .json({ message: '품목 삭제 중 오류가 발생했습니다' });
  }
});

export default router;
