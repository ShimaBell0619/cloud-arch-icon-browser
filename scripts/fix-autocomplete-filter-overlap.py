from pathlib import Path

app = Path("src/App.tsx")
text = app.read_text()
old = '''              <SearchAutocomplete
                id={searchListboxId}
                open={autocompleteOpen}
                session={session}
                items={autocompleteItems}
                activeIndex={activeAutocompleteIndex}
                onSelect={selectAutocompleteItem}
              />'''
new = '''              <SearchAutocomplete
                id={searchListboxId}
                open={autocompleteOpen}
                session={session}
                items={autocompleteItems}
                activeIndex={activeAutocompleteIndex}
                categoryFilterActive={selectedCategory !== null}
                onSelect={selectAutocompleteItem}
              />'''
if old not in text:
    raise SystemExit("SearchAutocomplete usage marker not found")
app.write_text(text.replace(old, new, 1))

component = Path("src/components/search-autocomplete.tsx")
text = component.read_text()
text = text.replace(
    '''  activeIndex: number;
  onSelect: (item: SearchAutocompleteItem) => void;''',
    '''  activeIndex: number;
  categoryFilterActive?: boolean;
  onSelect: (item: SearchAutocompleteItem) => void;''',
    1,
)
text = text.replace(
    '''  items,
  activeIndex,
  onSelect,''',
    '''  items,
  activeIndex,
  categoryFilterActive = false,
  onSelect,''',
    1,
)
old_class = '''    <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg">'''
new_class = '''    <div
      className={`absolute left-0 right-0 z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg ${categoryFilterActive ? "top-[calc(100%+3.3rem)]" : "top-[calc(100%+0.45rem)]"}`}
    >'''
if old_class not in text:
    raise SystemExit("Autocomplete position marker not found")
component.write_text(text.replace(old_class, new_class, 1))
