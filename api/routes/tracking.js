import { Router } from 'express';
import { emailTrackingService } from '../services/emailTrackingService.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Tracking pixel endpoint (public)
router.get('/pixel/:trackingId',
  asyncHandler(async (req, res) => {
    const { trackingId } = req.params;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Decode tracking ID to get email ID
    const trackingData = emailTrackingService.decodeTrackingId(trackingId);
    
    if (trackingData) {
      // Record email open event
      await emailTrackingService.recordOpen(trackingData.emailId, userAgent, ipAddress);
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', pixel.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Expires', '0');
    res.setHeader('Pragma', 'no-cache');
    
    res.send(pixel);
  })
);

// Click tracking endpoint (public)
router.get('/click/:trackingId',
  asyncHandler(async (req, res) => {
    const { trackingId } = req.params;
    const { url } = req.query;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing URL parameter',
      });
    }

    // Decode tracking ID to get email ID
    const trackingData = emailTrackingService.decodeTrackingId(trackingId);
    
    if (trackingData) {
      // Record email click event
      await emailTrackingService.recordClick(trackingData.emailId, url, userAgent, ipAddress);
    }

    // Redirect to the original URL
    res.redirect(302, url);
  })
);

export default router;