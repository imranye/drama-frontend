# Drama Frontend

A Next.js-based frontend application for the Drama platform, built with React, TanStack Query, Zustand, and Tailwind CSS.

## Features

- **Video Feed**: TikTok-style vertical video scroll with gesture controls
- **Token System**: Real-time token balance tracking and management
- **Authentication**: JWT-based login system
- **Responsive UI**: Mobile-first design with smooth animations
- **State Management**: Zustand for global state, TanStack Query for server state
- **Type Safety**: Full TypeScript support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Authentication**: JWT (jose)
- **Animations**: Framer Motion

---

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd drama-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8787
   ```
   
   Replace with your backend API URL if different.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app will automatically reload when you make changes.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run build:pages` - Build for static export (Cloudflare Pages)
- `npm run start` - Start production server
- `npm run preview` - Preview the static export locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
drama-frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── feed/         # Video feed page
│   │   ├── login/        # Login page
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   ├── providers.tsx # React Query provider
│   │   └── globals.css   # Global styles
│   ├── components/       # Reusable React components
│   │   ├── video-player.tsx
│   │   ├── feed-scroll.tsx
│   │   └── token-balance.tsx
│   ├── lib/              # Utilities and shared logic
│   │   ├── api.ts        # API client functions
│   │   └── store.ts      # Zustand state management
│   └── types/            # TypeScript type definitions
│       └── index.ts
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

---

## Deployment to Cloudflare Pages

Deploy your Drama frontend to Cloudflare Pages for fast, global CDN delivery.

### Prerequisites

- **Cloudflare account** - [Sign up free](https://dash.cloudflare.com/sign-up)
- **GitHub repository** - Code pushed to GitHub
- **(Optional) Wrangler CLI** - For command-line deployments

### Quick Deploy Steps (Recommended)

**Step 1: Connect Your Repository**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **Create** > **Pages**
3. Click **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select the repository containing your drama-frontend code

**Step 2: Configure Build Settings**

Set the following configuration:

| Setting | Value |
|---------|-------|
| **Framework preset** | Next.js (Static HTML Export) |
| **Build command** | `npm run build:pages` |
| **Build output directory** | `out` |
| **Root directory** | `/` (or subdirectory if needed) |
| **Node version** | 20 |

**Step 3: Set Environment Variables**

1. In the setup wizard, click **Add variable** (or go to Settings > Environment Variables after creation)
2. Add the following:
   - **Variable name**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your backend Worker URL
     - Example: `https://drama-backend.your-account.workers.dev`
     - Or your custom domain: `https://api.drama.com`

**Step 4: Deploy**

1. Click **Save and Deploy**
2. Cloudflare will build and deploy your application (takes 1-3 minutes)
3. Once complete, you'll receive a deployment URL: `https://drama-frontend.pages.dev`

**Step 5: Test Your Deployment**

Visit your deployment URL and verify:
- Login page loads
- You can authenticate
- Video feed displays correctly
- API calls work properly

### CLI Deploy Steps (Alternative)

For developers who prefer command-line deployment:

**1. Install Wrangler**

```bash
npm install -g wrangler
```

**2. Authenticate with Cloudflare**

```bash
wrangler login
```

This will open a browser window to authorize Wrangler.

**3. Build Your Application**

```bash
npm run build:pages
```

This creates a static export in the `out` directory.

**4. Deploy to Cloudflare Pages**

```bash
wrangler pages deploy out --project-name=drama-frontend
```

On first deployment, Wrangler will create the project automatically.

**5. Set Environment Variables**

```bash
wrangler pages secret put NEXT_PUBLIC_API_URL --project-name=drama-frontend
```

When prompted, enter your backend API URL.

**6. Verify Deployment**

Wrangler will output your deployment URL. Visit it to test your application.

### Environment Variables

Configure these in the Cloudflare Dashboard under **Settings > Environment Variables**:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API endpoint | `https://drama-backend.workers.dev` |

**Important Notes:**
- Variables with `NEXT_PUBLIC_` prefix are exposed to the browser
- Changes to environment variables require a rebuild
- You can set different values for **Production** and **Preview** environments

### Automatic Deployments

Once connected to GitHub, Cloudflare Pages automatically:

- **Deploys on push** - Every commit to your production branch triggers a deployment
- **Preview deployments** - Pull requests get unique preview URLs for testing
- **Deployment history** - All deployments are saved and can be rolled back

**Branch Configuration:**
- **Production branch**: `main` or `master` (configurable)
- **Preview branches**: All other branches get preview URLs like `https://abc123.drama-frontend.pages.dev`

### Custom Domain Setup

To use your own domain (e.g., `app.drama.com`):

**Step 1: Add Custom Domain**

1. In your Pages project, go to **Custom Domains**
2. Click **Set up a custom domain**
3. Enter your domain or subdomain
4. Click **Continue**

**Step 2: Configure DNS**

Cloudflare will provide DNS instructions:

- **If domain is on Cloudflare**: DNS records are added automatically
- **If domain is elsewhere**: Add the provided CNAME record to your DNS provider

**Step 3: Wait for SSL**

Cloudflare automatically provisions an SSL certificate (takes 1-5 minutes).

**Step 4: Verify**

Visit your custom domain to confirm it's working.

### Troubleshooting

#### Build Fails

**Problem**: Build command returns an error

**Solutions**:
- Verify **Node version** is set to `20` in build settings
- Check that all dependencies are listed in `package.json`
- Review build logs in the Cloudflare Dashboard under **Deployments**
- Try clearing cache: click **Retry deployment** > **Clear cache and retry**

#### Images Not Loading

**Problem**: Images return 404 errors

**Solutions**:
- Confirm `images.unoptimized: true` is in `next.config.js` (already configured)
- Verify images are in the `public/` directory
- Use correct paths: `/image.png` for files in `public/`
- Check that images are committed to your repository

#### API Calls Fail (CORS or 404)

**Problem**: Backend API returns errors or CORS issues

**Solutions**:
- Verify `NEXT_PUBLIC_API_URL` environment variable is set correctly
- Ensure your backend Worker is deployed and publicly accessible
- Test the API URL directly in a browser
- Check CORS configuration in your backend
- Rebuild after changing environment variables

#### Routing Issues (404 on Direct Navigation)

**Problem**: Navigating directly to `/feed` returns 404

**Solutions**:
- Verify `public/_redirects` file exists with:
  ```
  /*    /index.html   200
  ```
- Ensure `trailingSlash: true` in `next.config.js` (already configured)
- Check that static export completed successfully

#### Environment Variables Not Working

**Problem**: `process.env.NEXT_PUBLIC_API_URL` is undefined

**Solutions**:
- Environment variables must be set in **Cloudflare Dashboard**, not in code
- Variables must have `NEXT_PUBLIC_` prefix for browser access
- **Rebuild and redeploy** after adding or changing variables
- Check spelling and capitalization (case-sensitive)

#### Blank Page or JavaScript Errors

**Problem**: Page loads but nothing displays

**Solutions**:
- Open browser DevTools Console to see errors
- Check that API URL is accessible from your browser
- Verify build completed without errors
- Test the preview build locally: `npm run build:pages && npm run preview`

### Local Testing of Production Build

Before deploying, test the production build locally:

```bash
# Build the static export
npm run build:pages

# Preview the build
npm run preview
```

This serves the `out` directory at `http://localhost:3000` (or another port).

Test all features to ensure they work in production mode.

### Monitoring Your Deployment

**Analytics**
- Go to your Pages project > **Analytics**
- View page views, bandwidth, and request metrics

**Deployment Logs**
- Go to **Deployments** > Click a deployment
- View real-time build logs and error messages

**Error Tracking**
- Check browser console for client-side errors
- Use Cloudflare Web Analytics (free) for visitor insights

### Rolling Back a Deployment

If a deployment has issues:

1. Go to **Deployments** tab
2. Find the last working deployment
3. Click **...** (three dots) > **Rollback to this deployment**
4. Confirm the rollback

The site instantly reverts to the selected version.

### Preview Environments

Use different settings for production vs preview:

**In Cloudflare Dashboard:**
1. Go to **Settings > Environment Variables**
2. Use tabs to set variables for **Production** vs **Preview**
3. Example: Preview can use a staging backend URL

**Benefits:**
- Test changes safely before production
- Use different API endpoints for testing
- Every PR gets an isolated preview URL

### Performance Optimization

Cloudflare Pages provides:
- **Global CDN** - Content delivered from 300+ data centers
- **HTTP/3 & QUIC** - Fastest protocol support
- **Brotli compression** - Automatic compression for faster loads
- **Edge caching** - Static assets cached globally
- **Zero cold starts** - Instant page loads

### Advanced Configuration

**Build Caching**

Cloudflare automatically caches:
- Node modules
- Next.js build artifacts
- Dependency installations

To clear cache: Use **"Clear cache and retry"** option when retrying a deployment.

**Branch Deployments**

Configure specific branches for production:
1. Go to **Settings > Builds & deployments**
2. Set **Production branch** (default: `main`)
3. Configure **Preview branch behavior**

**Deploy Hooks**

Create webhook URLs to trigger deployments:
1. Go to **Settings > Builds & deployments**
2. Click **Add deploy hook**
3. Use the webhook URL in CI/CD pipelines

---

## Technical Details

For in-depth technical information about the Cloudflare Pages deployment configuration, see:
- [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)

---

## API Integration

The frontend communicates with the drama-backend Worker API:

**Authentication**
- JWT tokens stored in Zustand state and localStorage
- Automatic token refresh handling
- Protected routes redirect to login

**API Client** (`src/lib/api.ts`)
- Centralized API functions
- Automatic error handling
- TypeScript response types

**State Management** (`src/lib/store.ts`)
- Global user state
- Token balance tracking
- Video feed state

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `npm run dev`
4. Test production build with `npm run build:pages && npm run preview`
5. Push to GitHub (preview deployment created automatically)
6. Open a pull request

---

## Resources

- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Cloudflare Pages**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages/)
- **TanStack Query**: [tanstack.com/query](https://tanstack.com/query/latest)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Wrangler CLI**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler/)

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review deployment logs in Cloudflare Dashboard
- Inspect browser console for errors
- Test API endpoints directly

---

## License

[Your License Here]
