import { PackageError } from "./errors";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** A conservative preview gate, not a sanitizer. No parsed nodes leave this function. */
export function assertSafeSvgPreview(source: string, path: string): void {
  const refuse = () => {
    throw new PackageError({
      code: "UNSAFE_PREVIEW",
      phase: "preview",
      message:
        "This SVG cannot be previewed because it contains unsupported or potentially active content.",
      action: "You can still explicitly download the original SVG file.",
      path,
    });
  };
  // Refuse DTDs, entities, processing instructions other than the XML declaration,
  // and CSS escape sequences before XML parsing. Never fetch or expand resources.
  if (/<!DOCTYPE|<!ENTITY|<\?(?!xml\s)|\\/iu.test(source)) refuse();
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    document.getElementsByTagName("parsererror").length > 0 ||
    document.documentElement.localName !== "svg" ||
    document.documentElement.namespaceURI !== SVG_NAMESPACE
  )
    refuse();

  for (const element of document.getElementsByTagName("*")) {
    if (
      element.namespaceURI !== SVG_NAMESPACE ||
      /^(?:script|foreignObject|iframe|object|embed|audio|video|animate.*|set|discard)$/iu.test(
        element.localName,
      )
    )
      refuse();
    for (const attribute of element.attributes) {
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      if (attribute.namespaceURI === "http://www.w3.org/2000/xmlns/") continue;
      if (
        name.startsWith("on") ||
        name === "base" ||
        ((name === "href" || name === "src") && !/^#[^\s]+$/u.test(value)) ||
        hasExternalCss(value)
      )
        refuse();
    }
    if (
      element.localName === "style" &&
      hasExternalCss(element.textContent ?? "")
    )
      refuse();
  }
}

function hasExternalCss(value: string): boolean {
  // Removing comments prevents u/**/rl and @im/**/port from hiding references.
  const css = value.replace(/\/\*[\s\S]*?\*\//gu, "");
  return (
    /@import|expression\s*\(|(?:https?:|data:|javascript:|\/\/)/iu.test(css) ||
    /url\s*\(/iu.test(
      css.replace(
        /url\s*\(\s*(?:#[^\s)"']+|"#[^\s)"']+"|'#[^\s)"']+')\s*\)/giu,
        "",
      ),
    )
  );
}
