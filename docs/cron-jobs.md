# Cron Jobs in Consistency Tracker

This document describes how automatic background synchronization works in the Consistency Tracker application.

## Overview

The application syncs data from various platforms (GitHub, Twitter, Instagram, YouTube) on a regular schedule using Vercel Cron Jobs. These jobs run server-side code at specified intervals to fetch and update user data without requiring manual intervention.

## Schedule

- Sync jobs run **every 6 hours** at:
  - 00:00 UTC
  - 06:00 UTC  
  - 12:00 UTC
  - 18:00 UTC

## Implementation Details

### 1. Vercel Cron Configuration

The cron jobs are defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all",
      "schedule": "0 0,6,12,18 * * *"
    }
  ]
}
```

### 2. API Endpoint

The `/api/cron/sync-all` endpoint handles the background synchronization:

- It processes all users in the database
- For each user, it syncs data from all four platforms
- It uses the same API endpoints as the manual sync functionality
- Results are logged for monitoring

### 3. Security

The cron endpoint is protected by a secret key:

- A `CRON_SECRET` environment variable must be set
- The secret is verified before processing requests
- This prevents unauthorized triggering of the sync process

### 4. Manual Testing

You can manually test the cron job by making a POST request to `/api/cron/sync-all` with the proper authorization header:

```bash
curl -X POST https://your-domain.com/api/cron/sync-all \
  -H "Authorization: Bearer your-cron-secret-here" \
  -H "Content-Type: application/json"
```

## Troubleshooting

If the cron jobs aren't running as expected:

1. Check Vercel logs for any errors
2. Verify that the `CRON_SECRET` is set correctly
3. Confirm the API endpoints for individual platforms are working

## Future Improvements

- Add more granular scheduling options
- Implement per-user sync preferences
- Add failure retry mechanism
- Enhance logging and monitoring 