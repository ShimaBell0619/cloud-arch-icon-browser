from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"{path}: replacement not found: {old[:120]}")
    file.write_text(text.replace(old, new, 1))


# Carry the stable-origin / remembered-package App changes from merged PR #53
# into PR #54's larger App.tsx so Git can merge the independent features cleanly.
replace_once(
    "src/App.tsx",
    'import { choosePackageFile } from "@/lib/package-file-picker";\nimport { version } from "../package.json";',
    'import { choosePackageFile } from "@/lib/package-file-picker";\nimport {\n  commitSelectedPackageHandle,\n  forgetRememberedPackageHandle,\n  hasRememberedPackageHandle,\n  openRememberedPackageFile,\n} from "@/lib/package-handle-store";\nimport { version } from "../package.json";',
)
replace_once(
    "src/App.tsx",
    "    const previous = activeSessionRef.current;\n    activeSessionRef.current = candidate.session;\n    setTrayItems((current) => {",
    "    const previous = activeSessionRef.current;\n    activeSessionRef.current = candidate.session;\n    void commitSelectedPackageHandle(file);\n    setTrayItems((current) => {",
)
replace_once(
    "src/App.tsx",
    '  const inputRef = useRef<HTMLInputElement>(null);\n  const [dragging, setDragging] = useState(false);\n\n  const chooseFile = () => {\n    void choosePackageFile({ fallbackInput: inputRef.current }).then((file) => {',
    '  const inputRef = useRef<HTMLInputElement>(null);\n  const [dragging, setDragging] = useState(false);\n  const [rememberedPackageAvailable, setRememberedPackageAvailable] =\n    useState(false);\n  const [rememberedNotice, setRememberedNotice] = useState<string | null>(null);\n\n  useEffect(() => {\n    let cancelled = false;\n    void hasRememberedPackageHandle().then((available) => {\n      if (!cancelled) setRememberedPackageAvailable(available);\n    });\n    return () => {\n      cancelled = true;\n    };\n  }, []);\n\n  const chooseFile = () => {\n    setRememberedNotice(null);\n    void choosePackageFile({ fallbackInput: inputRef.current }).then((file) => {',
)
replace_once(
    "src/App.tsx",
    "  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {",
    '  const openPrevious = () => {\n    setRememberedNotice(null);\n    void openRememberedPackageFile({ requestPermission: true }).then((file) => {\n      if (file) {\n        onLoad(file);\n        return;\n      }\n      setRememberedPackageAvailable(false);\n      setRememberedNotice(\n        "The previous ZIP is no longer available. Choose the package again from this device.",\n      );\n    });\n  };\n\n  const forgetPrevious = () => {\n    void forgetRememberedPackageHandle().finally(() => {\n      setRememberedPackageAvailable(false);\n      setRememberedNotice("Previous package reference forgotten.");\n    });\n  };\n\n  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {',
)
replace_once(
    "src/App.tsx",
    "                The ZIP stays on this device. No package content is uploaded or\n                persisted by the application.",
    "                The ZIP stays on this device. No package content is uploaded or\n                copied into application storage.",
)
replace_once(
    "src/App.tsx",
    "                Drop the official Microsoft Azure Architecture Icons ZIP here,\n                or choose it from this device. The package is processed locally\n                for this session only.",
    "                Drop the official Microsoft Azure Architecture Icons ZIP here,\n                or choose it from this device. The package is processed locally.",
)
replace_once(
    "src/App.tsx",
    '              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">\n                <Button type="button" size="lg" onClick={chooseFile}>\n                  <UploadIcon aria-hidden="true" data-icon="inline-start" />\n                  Choose ZIP\n                </Button>',
    '              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">\n                {rememberedPackageAvailable ? (\n                  <Button type="button" size="lg" onClick={openPrevious}>\n                    <RefreshCwIcon\n                      aria-hidden="true"\n                      data-icon="inline-start"\n                    />\n                    Open previous ZIP\n                  </Button>\n                ) : null}\n                <Button\n                  type="button"\n                  size="lg"\n                  variant={rememberedPackageAvailable ? "outline" : "default"}\n                  onClick={chooseFile}\n                >\n                  <UploadIcon aria-hidden="true" data-icon="inline-start" />\n                  Choose ZIP\n                </Button>',
)
replace_once(
    "src/App.tsx",
    '              </div>\n              <p className="mt-4 text-xs text-muted-foreground">\n                Drag and drop works only before a package is loaded.\n              </p>',
    '              </div>\n              {rememberedPackageAvailable ? (\n                <button\n                  type="button"\n                  className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"\n                  onClick={forgetPrevious}\n                >\n                  Forget previous ZIP reference\n                </button>\n              ) : null}\n              {rememberedNotice ? (\n                <p role="status" className="mt-3 text-xs text-muted-foreground">\n                  {rememberedNotice}\n                </p>\n              ) : null}\n              <p className="mt-4 text-xs text-muted-foreground">\n                Drag and drop works only before a package is loaded. When\n                supported, only the local file handle is remembered; ZIP bytes\n                remain in the original file.\n              </p>',
)

# Carry PR #53's runtime/file-handle contract into #54's expanded Tray/Saved Set contract.
replace_once(
    "DESIGN.md",
    "- ZIP/SVG processing stays in the current browser session; selected package contents are not uploaded or persisted by the application.",
    "- ZIP/SVG processing stays local; selected package bytes, extracted SVGs, generated images, and package-session resources are not uploaded or persisted. On supported browsers, a `FileSystemFileHandle` reference may be persisted separately in IndexedDB after successful package validation so the user can reopen the same local file later.",
)
replace_once(
    "DESIGN.md",
    "- persistence of the selected ZIP, file handle, SVG bodies, generated image data, or package session,",
    "- persistence of the selected ZIP bytes, SVG bodies, generated image data, or package session outside the explicitly approved file-handle metadata boundary,",
)
replace_once(
    "DESIGN.md",
    "The CLI starts a temporary static server bound only to `127.0.0.1`, selects an available local port, prints the URL, attempts to open the default browser, and stops on `Ctrl+C`. The server supports only static `GET`/`HEAD`, rejects unsafe paths and unexpected Host headers, and returns `405` for mutating methods.",
    "The packaged CLI serves the app from the canonical origin `http://127.0.0.1:41731/`. It never falls back to a random port. If that origin already serves a matching Cloud Arch Icon Browser instance, a second invocation reuses/opens it; if another process owns the port, startup fails with an actionable error. The server remains bound only to `127.0.0.1`, supports only static `GET`/`HEAD`, rejects unsafe paths and unexpected Host headers, returns `405` for mutating methods, attempts to open the default browser, and stops on `Ctrl+C` when this invocation owns the server.",
)
replace_once(
    "DESIGN.md",
    "- A package is selected explicitly each session; reload returns to the package picker.\n- Initial selection supports the normal file input/drag-and-drop path. A transient File System Access picker may be preferred where supported, but its handle must not be persisted.",
    "- Reload returns to the package picker unless a previously remembered local file reference is available; package bytes are never restored from application storage.\n- Initial selection supports the normal file input/drag-and-drop path. A File System Access picker may be preferred where supported. Its `FileSystemFileHandle` may be persisted in IndexedDB only after the candidate package has passed normal validation.\n- A remembered handle with `prompt` permission is reopened only from an explicit `Open previous ZIP` user gesture; the app must not trigger a permission prompt during passive startup. Granted handles may be read only under normal browser permission rules.\n- Denied, stale, moved/deleted, malformed, or inaccessible remembered handles fall back safely to normal package selection. Users can explicitly forget the remembered reference without affecting Favorites or other UI metadata.",
)
replace_once(
    "DESIGN.md",
    "Never persist ZIP bytes, file handles, SVG/generated image bytes, Blob/Object URLs, readers, or package-session resources.",
    "Never persist ZIP bytes, SVG/generated image bytes, Blob/Object URLs, readers, or package-session resources. `localStorage` never contains file handles.\n\nA separate IndexedDB boundary may store one structured-cloneable `FileSystemFileHandle` for the previously validated package. The handle is a local permission-bearing reference, not a copy of the ZIP. Remembering it is best-effort and must never make package loading depend on IndexedDB availability. A replacement handle is committed only after the replacement package validates successfully.",
)
replace_once(
    "DESIGN.md",
    "Before loading, show a focused package picker/dropzone. Loading may report phases such as Reading, Validating, and Indexing without fake percentage progress.",
    "Before loading, show a focused package picker/dropzone. When a remembered File System Access handle exists, also expose explicit `Open previous ZIP` and `Forget previous ZIP reference` actions. Browser permission prompts must remain user-gesture driven. Loading may report phases such as Reading, Validating, and Indexing without fake percentage progress.",
)
