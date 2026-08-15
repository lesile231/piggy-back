/**
 * Extract localized values from FormData for a given field prefix
 * @param formData - FormData object from a form submission
 * @param prefix - Field name prefix (e.g., "names" for names.ko, names.en, etc.)
 * @returns Object with locale keys and their values
 */
export function extractLocalized(formData: FormData, prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of ["ko", "en", "ja", "zh"]) {
    const value = formData.get(`${prefix}.${locale}`) as string | null;
    if (value) result[locale] = value;
  }
  return result;
}
