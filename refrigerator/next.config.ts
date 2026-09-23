import type { NextConfig } from 'next';

// GitHub Pages build: PAGES_BASE_PATH=/refrigerator-lab npm run build -> static files in dist/client.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig =
  pagesBasePath === undefined
    ? { env: { NEXT_PUBLIC_BASE_PATH: '' } }
    : {
        output: 'export',
        basePath: pagesBasePath,
        trailingSlash: true,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_BASE_PATH: pagesBasePath },
      };

export default nextConfig;
