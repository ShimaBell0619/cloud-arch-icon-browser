import { describe, expect, it } from "vitest";
import { DUMMY_SVG } from "../test/package-fixtures";
import { assertSafeSvgPreview } from "./preview";

const svg = (inner: string, attributes = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${inner}</svg>`;

describe("SVG preview gate", () => {
  it("permits project-owned static shapes, local references and local CSS", () => {
    expect(() => assertSafeSvgPreview(DUMMY_SVG, "dummy.svg")).not.toThrow();
    expect(() =>
      assertSafeSvgPreview(
        svg(
          '<defs><linearGradient id="g"/><path id="p"/></defs><style>.a { fill: url( "#g" ); }</style><use xlink:href="#p"/><path fill="url( #g )"/>',
          'xmlns:xlink="http://www.w3.org/1999/xlink"',
        ),
        "dummy.svg",
      ),
    ).not.toThrow();
    expect(() =>
      assertSafeSvgPreview(
        svg("<path style=\"fill: url('#g')\"/>"),
        "dummy.svg",
      ),
    ).not.toThrow();
  });

  it.each([
    "not XML",
    "<svg>",
    "<svg/>",
    '<html xmlns="http://www.w3.org/2000/svg"/>',
    '<!DOCTYPE svg [<!ENTITY x "active">]><svg/>',
    '<?xml-stylesheet href="https://example.invalid/x"?><svg/>',
    svg("<script>alert(1)</script>"),
    svg("<foreignObject/>"),
    svg('<animate attributeName="href"/>'),
    svg('<set attributeName="href" to="external.svg"/>'),
    svg('<x xmlns="https://example.invalid/ns"/>'),
    svg('<path onload="alert(1)"/>'),
    svg('<use href="external.svg#id"/>'),
    svg('<image href="data:image/svg+xml,x"/>'),
    svg('<image href="//example.invalid/x"/>'),
    svg('<image href="https://example.invalid/x"/>'),
    svg('<image src="external.svg"/>'),
    svg('<use href="&#106;avascript:alert(1)"/>'),
    svg('<use href=""/>'),
    svg('<use href="#x"/>', 'xml:base="https://example.invalid/"'),
    svg('<path style="fill:url(external.svg#x)"/>'),
    svg('<path fill="url(&quot;external.svg#x&quot;)"/>'),
    svg('<style>@import "external.css";</style>'),
    svg('<style>@im/**/port "external.css";</style>'),
    svg("<style>.x { fill:u/**/rl(external.svg); }</style>"),
    svg("<style>.x { fill:u\\72l(external.svg); }</style>"),
    svg('<path style="width:expression(alert(1))"/>'),
    svg('<path fill="url(#x"/>'),
  ])(
    "refuses active/external/unsupported content %j without sanitizing it",
    (source) => {
      expect(() => assertSafeSvgPreview(source, "original.svg")).toThrowError(
        expect.objectContaining({
          problem: expect.objectContaining({
            code: "UNSAFE_PREVIEW",
            phase: "preview",
            path: "original.svg",
            action: expect.stringContaining("download the original"),
          }),
        }),
      );
    },
  );
});
