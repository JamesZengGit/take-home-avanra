import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router: IRouter = Router();

// GET /api/ad-slots - List ad slots (filtered by user role)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, available } = req.query;

    // Security: Filter based on user role
    const whereClause: any = {
      ...(type && {
        type: type as string as 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST',
      }),
      ...(available === 'true' && { isAvailable: true }),
    };

    // Publishers only see their own ad slots
    if (req.user!.role === 'publisher') {
      whereClause.publisherId = req.user!.publisherId;
    }
    // Sponsors can see all available ad slots (for booking)

    const adSlots = await prisma.adSlot.findMany({
      where: whereClause,
      include: {
        publisher: { select: { id: true, name: true, category: true, monthlyViews: true } },
        _count: { select: { placements: true } },
      },
      orderBy: { basePrice: 'desc' },
    });

    res.json(adSlots);
  } catch (error) {
    console.error('Error fetching ad slots:', error);
    res.status(500).json({ error: 'Failed to fetch ad slots' });
  }
});

// GET /api/ad-slots/:id - Get single ad slot with details
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    // Security: Check ownership for publishers, allow all for sponsors (they can view to book)
    const whereClause: any = { id };
    if (req.user!.role === 'publisher') {
      whereClause.publisherId = req.user!.publisherId;
    }

    const adSlot = await prisma.adSlot.findUnique({
      where: whereClause,
      include: {
        publisher: true,
        placements: {
          include: {
            campaign: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!adSlot) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }

    res.json(adSlot);
  } catch (error) {
    console.error('Error fetching ad slot:', error);
    res.status(500).json({ error: 'Failed to fetch ad slot' });
  }
});

// POST /api/ad-slots - Create new ad slot for authenticated publisher
// BUG: This accepts 'dimensions' and 'pricingModel' fields that don't exist in Prisma schema
// BUG: No input validation for basePrice (could be negative or zero)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, type, dimensions, basePrice, pricingModel } = req.body;

    // Security: Only publishers can create ad slots
    if (req.user!.role !== 'publisher') {
      res.status(403).json({ error: 'Only publishers can create ad slots' });
      return;
    }

    if (!name || !type || !basePrice) {
      res.status(400).json({
        error: 'Name, type, and basePrice are required',
      });
      return;
    }

    // TODO: Add authentication middleware to verify user owns publisherId ✅ DONE
    // TODO: Validate that basePrice is positive
    // TODO: Validate that 'type' is valid enum value

    const adSlot = await prisma.adSlot.create({
      data: {
        name,
        description,
        type,
        // dimensions, // Removed: This field doesn't exist in schema
        basePrice,
        // pricingModel: pricingModel || 'CPM', // Removed: This field doesn't exist in schema
        publisherId: req.user!.publisherId, // Security: Use authenticated publisher's ID
      },
      include: {
        publisher: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(adSlot);
  } catch (error) {
    console.error('Error creating ad slot:', error);
    res.status(500).json({ error: 'Failed to create ad slot' });
  }
});

// POST /api/ad-slots/:id/book - Book an ad slot (simplified booking flow)
// This marks the slot as unavailable and creates a simple booking record
router.post('/:id/book', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const { message } = req.body;

    // Security: Only sponsors can book ad slots
    if (req.user!.role !== 'sponsor') {
      res.status(403).json({ error: 'Only sponsors can book ad slots' });
      return;
    }

    // Check if slot exists and is available
    const adSlot = await prisma.adSlot.findUnique({
      where: { id },
      include: { publisher: true },
    });

    if (!adSlot) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }

    if (!adSlot.isAvailable) {
      res.status(400).json({ error: 'Ad slot is no longer available' });
      return;
    }

    // Mark slot as unavailable
    const updatedSlot = await prisma.adSlot.update({
      where: { id },
      data: { isAvailable: false },
      include: {
        publisher: { select: { id: true, name: true } },
      },
    });

    // In a real app, you'd create a Placement record here
    // For now, we just mark it as booked
    console.log(`Ad slot ${id} booked by sponsor ${req.user!.sponsorId}. Message: ${message || 'None'}`);

    res.json({
      success: true,
      message: 'Ad slot booked successfully!',
      adSlot: updatedSlot,
    });
  } catch (error) {
    console.error('Error booking ad slot:', error);
    res.status(500).json({ error: 'Failed to book ad slot' });
  }
});

// POST /api/ad-slots/:id/unbook - Reset ad slot to available (for testing)
router.post('/:id/unbook', requireAuth, async (req: Request, res: Response) => {
  // Security: Only allow publishers to unbook their own slots or sponsors who booked it
  // For simplicity in testing, we'll allow any authenticated user
  try {
    const { id } = req.params;

    const updatedSlot = await prisma.adSlot.update({
      where: { id: id as string },
      data: { isAvailable: true },
      include: {
        publisher: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      message: 'Ad slot is now available again',
      adSlot: updatedSlot,
    });
  } catch (error) {
    console.error('Error unbooking ad slot:', error);
    res.status(500).json({ error: 'Failed to unbook ad slot' });
  }
});

// TODO: Add PUT /api/ad-slots/:id endpoint
// TODO: Add DELETE /api/ad-slots/:id endpoint

export default router;
