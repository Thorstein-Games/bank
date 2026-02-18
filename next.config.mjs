/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const repositoryName = "bank";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: isProduction ? `/${repositoryName}` : "",
  assetPrefix: isProduction ? `/${repositoryName}/` : undefined
};

export default nextConfig;
