const rawOwners =
  process.env.NEXT_PUBLIC_PROJECT_OWNER_ADDRESSES ??
  process.env.NEXT_PUBLIC_PROJECT_OWNER_ADDRESS ??
  "";

const PROJECT_OWNER_ADDRESSES = rawOwners
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.length > 0);

export function isProjectOwner(address?: string | null) {
  if (!address) return false;
  if (PROJECT_OWNER_ADDRESSES.length === 0) {
    return false;
  }
  return PROJECT_OWNER_ADDRESSES.includes(address.toLowerCase());
}

export function getProjectOwners() {
  return PROJECT_OWNER_ADDRESSES;
}
