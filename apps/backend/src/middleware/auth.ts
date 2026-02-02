import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

// Use Prisma for database operations

// Extend Express Request to include user info
// This tells TypeScript that our requests can have user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'sponsor' | 'publisher';
        sponsorId?: string;
        publisherId?: string;
      };
    }
  }
}

/**
 * BEGINNER-FRIENDLY AUTHENTICATION MIDDLEWARE
 *
 * This middleware:
 * 1. Checks if user has a valid session cookie
 * 2. Gets user info from the database
 * 3. Adds user info to the request object
 * 4. Blocks access if no valid session
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Step 1: Get session cookie from the browser
    // Better Auth stores session ID in a cookie
    const sessionCookie = req.headers.cookie;

    if (!sessionCookie) {
      return res.status(401).json({
        error: 'Authentication required',
        hint: 'Please log in first'
      });
    }

    // Step 2: Extract session token from cookie string
    // Cookie format: "better-auth.session_token=abc123; other=value"
    const sessionMatch = sessionCookie.match(/better-auth\.session_token=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Invalid session',
        hint: 'Session cookie not found'
      });
    }

    // Step 3: Validate session with database using Prisma
    // Better Auth stores sessions in the 'session' table

    // Decode the session token (Better Auth format: token.signature)
    const tokenParts = decodeURIComponent(sessionToken).split('.');
    const actualToken = tokenParts[0]; // First part is the actual token

    // Query Better Auth session table using raw SQL through Prisma
    const sessionRows = await prisma.$queryRaw`
      SELECT
        s.id as session_id,
        s.token,
        s."expiresAt",
        u.id as user_id,
        u.email
      FROM session s
      JOIN "user" u ON s."userId" = u.id
      WHERE s.token = ${actualToken}
        AND s."expiresAt" > NOW()
    ` as Array<{
      session_id: string;
      token: string;
      expiresAt: Date;
      user_id: string;
      email: string;
    }>;

    if (sessionRows.length === 0) {
      return res.status(401).json({
        error: 'Session expired',
        hint: 'Please log in again'
      });
    }

    const sessionData = sessionRows[0];

    // Step 4: Determine user role by checking sponsor/publisher tables
    // Check if user is a sponsor
    const sponsor = await prisma.sponsor.findUnique({
      where: { userId: sessionData.user_id }
    });

    const publisher = await prisma.publisher.findUnique({
      where: { userId: sessionData.user_id }
    });

    // Step 5: Add user info to request object
    // Now other functions can access req.user
    if (sponsor) {
      req.user = {
        id: sessionData.user_id,
        role: 'sponsor',
        sponsorId: sponsor.id
      };
    } else if (publisher) {
      req.user = {
        id: sessionData.user_id,
        role: 'publisher',
        publisherId: publisher.id
      };
    } else {
      return res.status(403).json({
        error: 'User role not found',
        hint: 'Contact support'
      });
    }

    // Step 6: Continue to the actual API endpoint
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      hint: 'Server error - try again'
    });
  }
}

/**
 * OPTIONAL: Role-specific middleware
 * Use this when an endpoint is only for sponsors OR only for publishers
 */
export function requireSponsor(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'sponsor') {
    return res.status(403).json({
      error: 'Sponsors only',
      hint: 'This endpoint is for sponsors only'
    });
  }
  next();
}

export function requirePublisher(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'publisher') {
    return res.status(403).json({
      error: 'Publishers only',
      hint: 'This endpoint is for publishers only'
    });
  }
  next();
}