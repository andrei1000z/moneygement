function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/[î]/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function suggestTag(name: string, year: number): string {
  const slug = slugify(name);
  return `trip_${slug || "altfel"}_${year}`;
}
