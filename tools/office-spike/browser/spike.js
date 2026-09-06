const environmentElement = document.querySelector("#environment");
const logElement = document.querySelector("#log");

const diagnostics = {
  generatedAt: new Date().toISOString(),
  userAgent: navigator.userAgent,
  userAgentData: navigator.userAgentData
    ? {
        brands: navigator.userAgentData.brands,
        mobile: navigator.userAgentData.mobile,
        platform: navigator.userAgentData.platform,
      }
    : null,
  platform: navigator.platform,
  secureContext: window.isSecureContext,
  clipboardWrite: typeof navigator.clipboard?.write === "function",
  clipboardWriteText: typeof navigator.clipboard?.writeText === "function",
  clipboardItem: typeof ClipboardItem !== "undefined",
  svgClipboardSupport:
    typeof ClipboardItem !== "undefined" &&
    typeof ClipboardItem.supports === "function"
      ? ClipboardItem.supports("image/svg+xml")
      : null,
  tests: [],
};

renderEnvironment();

const pngBlobs = await Promise.all([
  makePng("A", "#1267d6"),
  makePng("B", "#7c3aed"),
  makePng("C", "#0f9d72"),
]);
const pngDataUrls = await Promise.all(pngBlobs.map(blobToDataUrl));
const vectorSvg = makeSvg("V", "#c2410c");
const vectorSvgBlob = new Blob([vectorSvg], { type: "image/svg+xml" });
const vectorSvgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vectorSvg)}`;

for (const button of document.querySelectorAll("button[data-action]")) {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    if (!action) return;

    button.disabled = true;
    try {
      if (action === "single-png") await copySinglePng();
      else if (action === "multi-png") await copyMultiplePngItems();
      else if (action === "html-images") await copyHtmlImages();
      else if (action === "svg-png") await copySvgWithPngFallback();
      else if (action === "copy-diagnostics") await copyDiagnostics();
    } catch (error) {
      record(
        action,
        "error",
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
      );
    } finally {
      button.disabled = false;
    }
  });
}

for (const tile of document.querySelectorAll("[data-drag]")) {
  tile.addEventListener("dragstart", (event) => {
    const dragType = tile.dataset.drag;
    if (!event.dataTransfer || !dragType) return;

    event.dataTransfer.effectAllowed = "copy";

    try {
      if (dragType === "png-file") {
        const file = new File([pngBlobs[0]], "cab-office-spike.png", {
          type: "image/png",
        });
        event.dataTransfer.items.add(file);
        event.dataTransfer.setData("text/uri-list", pngDataUrls[0]);
        event.dataTransfer.setData(
          "text/html",
          `<img src="${pngDataUrls[0]}" alt="Synthetic PNG" />`,
        );
      } else if (dragType === "svg-file") {
        const file = new File([vectorSvgBlob], "cab-office-spike.svg", {
          type: "image/svg+xml",
        });
        event.dataTransfer.items.add(file);
        event.dataTransfer.setData("text/uri-list", vectorSvgDataUrl);
        event.dataTransfer.setData(
          "text/html",
          `<img src="${vectorSvgDataUrl}" alt="Synthetic SVG" />`,
        );
      } else if (dragType === "chromium-download-url") {
        event.dataTransfer.setData(
          "DownloadURL",
          `image/png:cab-office-spike-downloadurl.png:${pngDataUrls[1]}`,
        );
      }
      record(dragType, "dragstart", Array.from(event.dataTransfer.types));
    } catch (error) {
      record(
        dragType,
        "drag-error",
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
      );
    }
  });
}

async function copySinglePng() {
  requireClipboard();
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": pngBlobs[0] }),
  ]);
  record("single-png", "copied", {
    clipboardItems: 1,
    declaredTypes: [["image/png"]],
  });
}

async function copyMultiplePngItems() {
  requireClipboard();
  const items = pngBlobs.map(
    (blob) => new ClipboardItem({ "image/png": blob }),
  );
  await navigator.clipboard.write(items);
  record("multi-png", "copied", {
    clipboardItems: items.length,
    declaredTypes: items.map((item) => item.types),
  });
}

async function copyHtmlImages() {
  requireClipboard();
  const html = `<div>${pngDataUrls
    .map(
      (url, index) =>
        `<img src="${url}" alt="Synthetic ${index + 1}" width="160" height="160" />`,
    )
    .join("")}</div>`;
  const plain = "Synthetic A\nSynthetic B\nSynthetic C";
  const item = new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([plain], { type: "text/plain" }),
  });
  await navigator.clipboard.write([item]);
  record("html-images", "copied", {
    clipboardItems: 1,
    declaredTypes: item.types,
  });
}

async function copySvgWithPngFallback() {
  requireClipboard();
  if (
    typeof ClipboardItem.supports !== "function" ||
    !ClipboardItem.supports("image/svg+xml")
  ) {
    throw new Error(
      "ClipboardItem.supports('image/svg+xml') is false in this browser.",
    );
  }

  const item = new ClipboardItem({
    "image/svg+xml": vectorSvgBlob,
    "image/png": pngBlobs[2],
  });
  await navigator.clipboard.write([item]);
  record("svg-png", "copied", {
    clipboardItems: 1,
    declaredTypes: item.types,
  });
}

async function copyDiagnostics() {
  if (!navigator.clipboard?.writeText)
    throw new Error("Clipboard.writeText is unavailable.");
  const payload = JSON.stringify(diagnostics, null, 2);
  await navigator.clipboard.writeText(payload);
  record("copy-diagnostics", "copied", { bytes: new Blob([payload]).size });
}

function requireClipboard() {
  if (!window.isSecureContext)
    throw new Error("The page is not a secure context.");
  if (!navigator.clipboard?.write)
    throw new Error("navigator.clipboard.write is unavailable.");
  if (typeof ClipboardItem === "undefined")
    throw new Error("ClipboardItem is unavailable.");
}

function renderEnvironment() {
  const entries = [
    ["Secure context", String(diagnostics.secureContext)],
    ["Clipboard.write", String(diagnostics.clipboardWrite)],
    ["ClipboardItem", String(diagnostics.clipboardItem)],
    ["SVG clipboard support", String(diagnostics.svgClipboardSupport)],
    ["Platform", diagnostics.platform],
    ["User agent", diagnostics.userAgent],
  ];

  for (const [term, description] of entries) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = description;
    environmentElement.append(dt, dd);
  }
}

function record(test, status, detail) {
  const entry = { at: new Date().toISOString(), test, status, detail };
  diagnostics.tests.push(entry);
  logElement.textContent = `${logElement.textContent}${JSON.stringify(entry)}\n`;
  logElement.scrollTop = logElement.scrollHeight;
}

function makeSvg(label, fill) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${fill}"/><circle cx="256" cy="256" r="150" fill="white" fill-opacity="0.9"/><text x="256" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="180" font-weight="700" fill="${fill}">${label}</text></svg>`;
}

async function makePng(label, fill) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.fillStyle = fill;
  context.fillRect(0, 0, 512, 512);
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.beginPath();
  context.arc(256, 256, 150, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = fill;
  context.font = "700 180px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 256, 268);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas PNG encoding failed."));
    }, "image/png");
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Blob data URL conversion failed."));
    reader.readAsDataURL(blob);
  });
}
