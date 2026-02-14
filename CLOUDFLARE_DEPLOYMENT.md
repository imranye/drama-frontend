# Cloudflare Pages Deployment Guide

This guide covers deploying the Drama Frontend to Cloudflare Pages.

## Prerequisites

- Cloudflare account
- GitHub repository with the drama-frontend code
- Node.js 20 installed locally (for testing)

## Configuration Files

The following files are configured for Cloudflare Pages deployment:

- `wrangler.toml` - Cloudflare Pages configuration
- `.node-version` - Specifies Node.js 20
- `next.config.js` - Configured with `output: 'export'` for static export
- `public/_redirects` - Client-side routing configuration
- `package.json` - Includes `build:pages` and `preview` scripts

## Deployment Methods

### Method 1: Deploy via Cloudflare Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Workers & Pages > Create > Pages
   - Connect your GitHub account
   - Select the repository containing drama-frontend

2. **Configure Build Settings**
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `out`
   - **Root directory**: `/` (or `drama-frontend` if it's in a subdirectory)
   - **Node version**: 20

3. **Set Environment Variables**
   - Go to Settings > Environment Variables
   - Add the following variable:
     - `NEXT_PUBLIC_API_URL`: Your drama-backend Worker URL (e.g., `https://drama-backend.your-account.workers.dev`)

4. **Deploy**
   - Click "Save and Deploy"
   - Cloudflare will build and deploy your app
   - You'll get a URL like `https://drama-frontend.pages.dev`

### Method 2: Deploy via Wrangler CLI

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Deploy from the project directory**
   ```bash
   cd drama-frontend
   npm run build:pages
   wrangler pages deploy out --project-name=drama-frontend
   ```

4. **Set Environment Variables**
   ```bash
   wrangler pages secret put NEXT_PUBLIC_API_URL --project-name=drama-frontend
   # When prompted, enter: https://drama-backend.your-account.workers.dev
   ```

## Custom Domain Setup

1. In Cloudflare Dashboard, go to your Pages project
2. Navigate to Custom Domains
3. Click "Set up a custom domain"
4. Enter your domain (e.g., `app.drama.com`)
5. Follow the DNS configuration instructions

## Environment Variables

Configure these in Cloudflare Pages Dashboard under Settings > Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Drama backend API URL | `https://drama-backend.your-account.workers.dev` |

**Important**: Separate environment variables for Production and Preview environments if needed.

## Local Testing

Test the production build locally before deploying:

```bash
# Build the static export
npm run build:pages

# Preview the build locally
npm run preview
```

This will serve the `out` directory on http://localhost:3000 (or another port).

## Continuous Deployment

Once connected to GitHub, Cloudflare Pages automatically:
- Deploys on every push to the main/production branch
- Creates preview deployments for pull requests
- Maintains deployment history

### Branch Configuration

- **Production branch**: `main` or `master`
- **Preview branches**: All other branches get preview URLs

## Troubleshooting

### Build Fails

**Issue**: Build command fails
- Check Node version is set to 20 in build settings
- Verify all dependencies are in `package.json`
- Check build logs in Cloudflare Dashboard

### Images Not Loading

**Issue**: Images return 404 errors
- Ensure `images.unoptimized: true` is in `next.config.js`
- Verify image paths are correct and images exist in `public/`
- Use relative paths for static images

### API Calls Fail

**Issue**: Backend API calls return CORS or 404 errors
- Verify `NEXT_PUBLIC_API_URL` environment variable is set correctly
- Check that the backend Worker is deployed and accessible
- Ensure CORS is configured correctly in the backend

### Routing Issues

**Issue**: Direct navigation to routes returns 404
- Verify `public/_redirects` file exists with: `/*    /index.html   200`
- Ensure `trailingSlash: true` is set in `next.config.js`

### Environment Variables Not Working

**Issue**: `process.env.NEXT_PUBLIC_API_URL` is undefined
- Environment variables must be set in Cloudflare Dashboard
- Variables must have `NEXT_PUBLIC_` prefix to be available in browser
- Rebuild and redeploy after changing environment variables

## Advanced Configuration

### Preview Deployments

Configure different settings for preview vs production:

In Cloudflare Dashboard:
1. Go to Settings > Environment Variables
2. Add variables separately for "Production" and "Preview"
3. Preview branches can use staging backend URLs

### Build Caching

Cloudflare Pages automatically caches:
- Node modules
- Next.js build cache
- Static assets

To clear cache:
- Retry deployment from the Deployments tab
- Or use "Clear cache and retry" option

### Performance Optimization

The static export configuration provides:
- Fast global CDN delivery
- Automatic HTTP/2 and HTTP/3
- Brotli compression
- Edge caching

## Monitoring

Monitor your deployment:
- **Analytics**: Pages Dashboard > Analytics
- **Logs**: Real-time deployment logs in Dashboard
- **Errors**: Check browser console for client-side errors

## Rollback

To rollback to a previous deployment:
1. Go to Deployments tab
2. Find the working deployment
3. Click "..." > "Rollback to this deployment"

## Next Steps

After deployment:
1. Test all routes and features
2. Verify API integration works
3. Set up custom domain
4. Configure preview environments
5. Monitor analytics and performance

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
