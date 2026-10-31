import { ImageResponse } from "next/og";
import { IconArt } from "../icon-art";

const VARIANTS = {
  "192": { size: 192, inset: 0 },
  "512": { size: 512, inset: 0 },
  maskable: { size: 512, inset: 10 },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  const variant = VARIANTS[size as keyof typeof VARIANTS];
  if (!variant) return new Response("Not found", { status: 404 });
  return new ImageResponse(<IconArt size={variant.size} inset={variant.inset} />, {
    width: variant.size,
    height: variant.size,
  });
}
