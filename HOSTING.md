# IREX Hosting Guide

This project is a Next.js application with a server API route for application email delivery.
Deploy it on a Node.js host that can run Next.js server routes.

## Requirements

- Node.js 20 or newer
- npm
- A Resend API key

## Environment Variables

Create these variables on the host:

```env
EMAIL_DELIVERY_MODE=resend
RESEND_API_KEY=your_resend_api_key
APPLICATION_EMAIL=alipourmohammadi90@gmail.com
RESEND_FROM_EMAIL=IREX Applications <onboarding@resend.dev>
```

For a production domain, replace `RESEND_FROM_EMAIL` with a verified sender domain in Resend.

## Install and Build

```bash
npm ci
npm run build
```

## Run

```bash
npm run start
```

The app starts on port `3000` by default. Set `PORT` if your host requires another port.

## Email Health Check

After deployment, open:

```text
/api/apply
```

Expected configured response:

```json
{
  "mode": "resend",
  "configured": true
}
```

Then submit the Apply form to test real email delivery.
