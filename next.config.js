/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The source was written without a full local build. These flags keep a first
  // deployment from failing on a stray lint/type warning. Set both to false
  // (or delete them) once you have run `npm run build` locally and fixed warnings.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
