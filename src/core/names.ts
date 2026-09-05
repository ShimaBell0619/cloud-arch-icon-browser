export function parseDisplayName(originalFilename: string): {
  displayName: string;
  matchesNamingConvention: boolean;
} {
  const match = /^\d+-icon-service-(.+)\.svg$/u.exec(originalFilename);
  const name = match?.[1] ?? originalFilename.replace(/\.svg$/iu, "");
  return {
    displayName: name.replaceAll("-", " "),
    matchesNamingConvention: match !== null,
  };
}

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export function compareNames(left: string, right: string): number {
  return (
    collator.compare(left, right) || (left < right ? -1 : left > right ? 1 : 0)
  );
}
