from pathlib import Path
import subprocess

subprocess.run(["python3", "scripts/apply-v02-combined.py"], check=True)

path = Path("src/App.tsx")
text = path.read_text()
text = text.replace('} from "@/core";} from "@/core";', '} from "@/core";', 1)

aria_start = '                aria-autocomplete="list"\n'
placeholder = '                placeholder="Search icons by name, filename, or category"\n'
start_index = text.find(aria_start)
end_index = text.find(placeholder, start_index)
if start_index < 0 or end_index < 0:
    raise SystemExit("Search ARIA transform marker not found")
text = text[:start_index] + text[end_index:]

path.write_text(text)
