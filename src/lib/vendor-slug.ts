/** Slugify a vendor name for use in the /renewals/[vendor] route. */
export const toVendorSlug = (vendor: string) => vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
