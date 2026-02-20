export function isBlobUrl(url: string | null | undefined): url is string {
  return Boolean(url && url.startsWith('blob:'));
}

export function revokeBlobUrl(url: string | null | undefined): void {
  if (isBlobUrl(url)) {
    URL.revokeObjectURL(url);
  }
}

export function replaceManagedObjectUrl(
  previousUrl: string | null | undefined,
  nextUrl: string | null | undefined
): string | null {
  if (previousUrl && previousUrl !== nextUrl) {
    revokeBlobUrl(previousUrl);
  }
  return nextUrl ?? null;
}
