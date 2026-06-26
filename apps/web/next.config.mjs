import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // @at/api is a workspace package we deep-import generated mock JSON from.
  transpilePackages: ["@at/api"],
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
