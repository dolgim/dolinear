export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function generateUniqueSlug(
  baseSlug: string,
  existsCheck: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existsCheck(baseSlug))) return baseSlug
  let counter = 2
  while (await existsCheck(`${baseSlug}-${counter}`)) {
    counter++
  }
  return `${baseSlug}-${counter}`
}
