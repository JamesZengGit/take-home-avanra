import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router: IRouter = Router();

// GET /api/placements - List placements
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaignId, publisherId, status } = req.query;

    const placements = await prisma.placement.findMany({
      where: {
        ...(campaignId && { campaignId: getParam(campaignId) }),
        ...(publisherId && { publisherId: getParam(publisherId) }),
        ...(status && {
          status: status as string as
            | 'PENDING'
            | 'APPROVED'
            | 'REJECTED'
            | 'ACTIVE'
            | 'PAUSED'
            | 'COMPLETED',
        }),
      },
      include: {
        campaign: { select: { id: true, name: true } },
        creative: { select: { id: true, name: true, type: true } },
        adSlot: { select: { id: true, name: true, type: true } },
        publisher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(placements);
  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// POST /api/placements - Create new placement
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaignId,
      creativeId,
      adSlotId,
      publisherId,
      agreedPrice,
      pricingModel,
      startDate,
      endDate,
    } = req.body;

    if (!campaignId || !creativeId || !adSlotId || !publisherId || !agreedPrice) {
      res.status(400).json({
        error: 'campaignId, creativeId, adSlotId, publisherId, and agreedPrice are required',
      });
      return;
    }

    const placement = await prisma.placement.create({
      data: {
        campaignId,
        creativeId,
        adSlotId,
        publisherId,
        agreedPrice,
        pricingModel: pricingModel || 'CPM',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        campaign: { select: { name: true } },
        publisher: { select: { name: true } },
      },
    });

    res.status(201).json(placement);
  } catch (error) {
    console.error('Error creating placement:', error);
    res.status(500).json({ error: 'Failed to create placement' });
  }
});

export default router;
