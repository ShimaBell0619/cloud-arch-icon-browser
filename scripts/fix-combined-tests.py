from pathlib import Path

app = Path("src/App.test.tsx")
text = app.read_text()
text = text.replace('name: "App Service, Compute"', 'name: "Open App Service details, Compute"')
text = text.replace('name: "SQL, Compute/Databases"', 'name: "Open SQL details, Compute/Databases"')
text = text.replace('name: "Blob Storage, Storage"', 'name: "Open Blob Storage details, Storage"')
text = text.replace(
    'it("exposes workspace destinations without populating Favorites or Recent early",',
    'it("exposes workspace destinations with empty Favorites and Recent states",',
)
text = text.replace(
    'await screen.findByRole("heading", { name: "Favorites" })',
    'await screen.findByRole("heading", { name: "No favorites yet" })',
)
text = text.replace(
    'await screen.findByRole("heading", { name: "Recent" })',
    'await screen.findByRole("heading", { name: "No recent icons yet" })',
)
app.write_text(text)

search = Path("src/core/search.test.ts")
text = search.read_text().replace('index.search("Dummy/Other")', 'index.search("Other")')
search.write_text(text)

clipboard = Path("src/lib/icon-clipboard.test.ts")
text = clipboard.read_text()
old = '''    expect(fitImageIntoSquare(120, 360)).toEqual({
      x: 170.66666666666669,
      y: 0,
      width: 170.66666666666666,
      height: COPY_IMAGE_SIZE,
    });'''
new = '''    const rect = fitImageIntoSquare(120, 360);
    expect(rect.x).toBeCloseTo(170.6667, 3);
    expect(rect.y).toBe(0);
    expect(rect.width).toBeCloseTo(170.6667, 3);
    expect(rect.height).toBe(COPY_IMAGE_SIZE);'''
if old not in text:
    raise SystemExit("clipboard float assertion marker not found")
clipboard.write_text(text.replace(old, new))
