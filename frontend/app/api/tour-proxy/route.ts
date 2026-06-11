import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IMAGE_HOST_PATTERNS = [
  /\.r2\.dev$/i,
  /yeloo-api\.onrender\.com$/i,
  /pannellum\.org$/i,
];

const isAllowedImageHost = (hostname: string) =>
  ALLOWED_IMAGE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ detail: "URL manquante." }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ detail: "URL invalide." }, { status: 400 });
  }

  if (targetUrl.protocol !== "https:" || !isAllowedImageHost(targetUrl.hostname)) {
    return NextResponse.json({ detail: "Source 360 non autorisée." }, { status: 403 });
  }

  const upstream = await fetch(targetUrl.toString(), {
    cache: "force-cache",
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { detail: "Image 360 indisponible." },
      { status: upstream.status || 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ detail: "Le fichier 360 n'est pas une image." }, { status: 415 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
