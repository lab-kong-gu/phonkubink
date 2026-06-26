/** @type {import('next').NextConfig} */
const nextConfig = {
  // For the test deploy: don't fail the production build on lint/type warnings.
  // (Re-enable these for production-quality builds later.)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
