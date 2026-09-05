import { describe, expect, it } from "vitest";
import {
  canonicalPersistedIconPath,
  createPersistedIconReference,
  matchPersistedIconReference,
} from "./persisted-identity";
import type { IconEntry } from "./types";

function icon(
  originalFilename: string,
  categoryPath = "Compute",
  displayName = originalFilename.replace(/\.svg$/u, ""),
): IconEntry {
  const visiblePath = categoryPath
    ? `${categoryPath}/${originalFilename}`
    : originalFilename;
  return {
    id: `Azure_Public_Service_Icons/${visiblePath}`,
    originalPath: `Azure_Public_Service_Icons/${visiblePath}`,
    originalFilename,
    displayName,
    matchesNamingConvention: /^\d+-icon-service-/u.test(originalFilename),
    categoryId: categoryPath
      ? `Azure_Public_Service_Icons/${categoryPath}`
      : null,
    categoryPath,
    uncompressedSize: 123,
  };
}

describe("persisted icon identity", () => {
  it("builds identity from the visible path without the hidden package root", () => {
    const entry = icon("10035-icon-service-App-Services.svg", "Compute");

    expect(createPersistedIconReference(entry)).toEqual({
      canonicalPath: "Compute/10035-icon-service-App-Services.svg",
      originalFilename: "10035-icon-service-App-Services.svg",
      displayName: "10035-icon-service-App-Services",
      categoryPath: "Compute",
    });
    expect(canonicalPersistedIconPath("", "plain.svg")).toBe("plain.svg");
  });

  it("prefers an exact visible-path match", () => {
    const saved = createPersistedIconReference(
      icon("10035-icon-service-App-Services.svg", "Compute"),
    );
    const exact = icon("10035-icon-service-App-Services.svg", "Compute");
    const sameNameElsewhere = icon(
      "10035-icon-service-App-Services.svg",
      "Web",
    );

    const result = matchPersistedIconReference(saved, [sameNameElsewhere, exact]);

    expect(result?.matchedBy).toBe("exact-path");
    expect(result?.icon).toBe(exact);
  });

  it("re-matches a unique service after a numeric prefix or folder change", () => {
    const saved = createPersistedIconReference(
      icon("10035-icon-service-App-Services.svg", "Compute", "App Services"),
    );
    const current = icon(
      "10999-icon-service-App-Services.svg",
      "Web",
      "App Services",
    );

    const result = matchPersistedIconReference(saved, [current]);

    expect(result?.matchedBy).toBe("canonical-name");
    expect(result?.icon).toBe(current);
    expect(result?.healedReference.canonicalPath).toBe(
      "Web/10999-icon-service-App-Services.svg",
    );
  });

  it("does not guess when the fallback service name is ambiguous", () => {
    const saved = createPersistedIconReference(
      icon("10035-icon-service-App-Services.svg", "Old"),
    );
    const first = icon("10999-icon-service-App-Services.svg", "Web");
    const second = icon("11000-icon-service-App-Services.svg", "Compute");

    expect(matchPersistedIconReference(saved, [first, second])).toBeNull();
  });

  it("never performs fuzzy name migration", () => {
    const saved = createPersistedIconReference(
      icon("10035-icon-service-App-Service.svg", "Old"),
    );
    const merelySimilar = icon(
      "10999-icon-service-App-Services.svg",
      "Web",
    );

    expect(matchPersistedIconReference(saved, [merelySimilar])).toBeNull();
  });
});
