import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router: IRouter = Router();

// GET /api/campaigns - List campaigns for authenticated sponsor
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    // Security: Only show campaigns for the authenticated sponsor
    const campaigns = await prisma.campaign.findMany({
      where: {
        sponsorId: req.user!.sponsorId, // Only user's own campaigns
        ...(status && { status: status as string as 'ACTIVE' | 'PAUSED' | 'COMPLETED' }),
      },
      include: {
        sponsor: { select: { id: true, name: true, logo: true } },
        _count: { select: { creatives: true, placements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id - Get single campaign with details (ownership verified)
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    // Security: Only show campaign if user owns it
    const campaign = await prisma.campaign.findUnique({
      where: {
        id,
        sponsorId: req.user!.sponsorId // Ownership check
      },
      include: {
        sponsor: true,
        creatives: true,
        placements: {
          include: {
            adSlot: true,
            publisher: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.status(200).json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns - Create new campaign for authenticated sponsor
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      budget,
      cpmRate,
      cpcRate,
      startDate,
      endDate,
      targetCategories,
      targetRegions,
    } = req.body;

    if (!name || !budget || !startDate || !endDate) {
      res.status(400).json({
        error: 'Name, budget, startDate, and endDate are required',
      });
      return;
    }

    // Security: Use authenticated user's sponsorId
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        budget,
        cpmRate,
        cpcRate,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetCategories: targetCategories || [],
        targetRegions: targetRegions || [],
        sponsorId: req.user!.sponsorId, // Use authenticated sponsor's ID
      },
      include: {
        sponsor: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id - Update campaign for authenticated sponsor
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const {
      name,
      description,
      budget,
      cpmRate,
      cpcRate,
      startDate,
      endDate,
      targetCategories,
      targetRegions,
      status,
    } = req.body;

    if (!name || !budget || !startDate || !endDate) {
      res.status(400).json({
        error: 'Name, budget, startDate, and endDate are required',
      });
      return;
    }

    // Security: Only update campaign if user owns it
    const campaign = await prisma.campaign.findUnique({
      where: {
        id,
        sponsorId: req.user!.sponsorId // Ownership check
      }
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Security: Use authenticated user's sponsorId
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        description,
        budget,
        cpmRate,
        cpcRate,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetCategories: targetCategories || [],
        targetRegions: targetRegions || [],
        sponsorId: req.user!.sponsorId, // Use authenticated sponsor's ID
      },
      include: {
        sponsor: { select: { id: true, name: true } },
      },
    });

    res.status(200).json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id - Delete campaign for authenticated sponsor
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    // Security: Only delete campaign if user owns it
    const campaign = await prisma.campaign.findUnique({
      where: {
        id,
        sponsorId: req.user!.sponsorId // Ownership check
      }
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Delete campaign
    await prisma.campaign.delete({
      where: { id }
    });

    res.status(204).send(); // No content response for successful deletion
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
