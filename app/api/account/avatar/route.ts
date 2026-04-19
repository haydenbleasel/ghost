import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { del, get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const GET = async (request: Request) => {
  const user = await requireUser();
  if (!user.image) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await get(user.image, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  });

  if (!result) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
};

export const POST = async (request: Request) => {
  const user = await requireUser();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const blob = await put(`avatars/${user.id}/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  const previous = user.image;
  await prisma.user.update({
    data: { image: blob.pathname },
    where: { id: user.id },
  });

  if (previous && previous !== blob.pathname) {
    await del(previous).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
};

export const DELETE = async () => {
  const user = await requireUser();
  if (!user.image) {
    return NextResponse.json({ ok: true });
  }

  await del(user.image).catch(() => undefined);
  await prisma.user.update({
    data: { image: null },
    where: { id: user.id },
  });

  return NextResponse.json({ ok: true });
};
