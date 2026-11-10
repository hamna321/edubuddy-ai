/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // officeparser reads files / uses node APIs at runtime; keep it external
    // so webpack doesn't try to bundle it into the server build.
    serverComponentsExternalPackages: ["officeparser"],
  },
};

export default nextConfig;
