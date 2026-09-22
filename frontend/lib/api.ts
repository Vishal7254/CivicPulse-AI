export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export function getImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const cleanPath = imageUrl.replace(/^app\//, "").replace(/^\//, "");
  return `${API_BASE_URL}/${cleanPath}`;
}
