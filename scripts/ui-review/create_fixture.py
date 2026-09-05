from __future__ import annotations

import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ICONS = [
    ("Dummy/AI/1-icon-service-AI-Foundry.svg", "#2563eb"),
    ("Dummy/AI/2-icon-service-Azure-OpenAI.svg", "#7c3aed"),
    ("Dummy/Compute/3-icon-service-App-Service.svg", "#0ea5e9"),
    ("Dummy/Compute/4-icon-service-Functions.svg", "#f59e0b"),
    ("Dummy/Compute/Containers/5-icon-service-Container-Apps.svg", "#06b6d4"),
    ("Dummy/Compute/Containers/6-icon-service-Kubernetes-Service.svg", "#2563eb"),
    ("Dummy/Databases/7-icon-service-SQL-Database.svg", "#0284c7"),
    ("Dummy/Databases/8-icon-service-Cosmos-DB.svg", "#8b5cf6"),
    ("Dummy/Networking/9-icon-service-Virtual-Network.svg", "#16a34a"),
    ("Dummy/Networking/10-icon-service-Application-Gateway.svg", "#0891b2"),
    ("Dummy/Storage/11-icon-service-Blob-Storage.svg", "#0ea5e9"),
    ("Dummy/Storage/12-icon-service-Storage-Account.svg", "#2563eb"),
]


def svg_bytes(color: str) -> bytes:
    source = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="8" y="8" width="48" height="48" rx="12" fill="{color}"/>
  <circle cx="32" cy="28" r="10" fill="white" opacity="0.95"/>
  <rect x="21" y="42" width="22" height="5" rx="2.5" fill="white" opacity="0.9"/>
</svg>'''
    return source.encode("utf-8")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: create_fixture.py <output.zip>")

    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)

    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for path, color in ICONS:
            archive.writestr(path, svg_bytes(color))
        archive.writestr(
            "readme.txt",
            b"Project-owned temporary UI review fixture. No Microsoft assets.",
        )


if __name__ == "__main__":
    main()
