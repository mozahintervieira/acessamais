import json
import sys
from pathlib import Path

import pdfplumber


def compact_text(value):
    return " ".join((value or "").replace("\x00", " ").split())


def word_blocks(words):
    blocks = []
    current = []
    last_bottom = None

    for word in words:
        text = compact_text(word.get("text"))
        if not text:
            continue

        top = float(word.get("top") or 0)
        bottom = float(word.get("bottom") or top)

        if current and last_bottom is not None and abs(top - last_bottom) > 8:
            blocks.append({
                "text": compact_text(" ".join(item["text"] for item in current)),
                "x0": min(item["x0"] for item in current),
                "top": min(item["top"] for item in current),
                "x1": max(item["x1"] for item in current),
                "bottom": max(item["bottom"] for item in current),
            })
            current = []

        current.append({
            "text": text,
            "x0": float(word.get("x0") or 0),
            "top": top,
            "x1": float(word.get("x1") or 0),
            "bottom": bottom,
        })
        last_bottom = bottom

    if current:
        blocks.append({
            "text": compact_text(" ".join(item["text"] for item in current)),
            "x0": min(item["x0"] for item in current),
            "top": min(item["top"] for item in current),
            "x1": max(item["x1"] for item in current),
            "bottom": max(item["bottom"] for item in current),
        })

    return blocks


def extract(path, max_pages=None):
    result = {
        "filePath": str(Path(path).resolve()),
        "pages": [],
    }

    with pdfplumber.open(path) as pdf:
        result["pageCount"] = len(pdf.pages)

        pages = pdf.pages[:max_pages] if max_pages else pdf.pages

        for index, page in enumerate(pages, start=1):
            text = compact_text(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
            words = page.extract_words(
                x_tolerance=1,
                y_tolerance=3,
                keep_blank_chars=False,
                use_text_flow=True,
            )
            tables = []

            try:
                raw_tables = page.extract_tables() or []
            except Exception:
                raw_tables = []

            for table_index, table in enumerate(raw_tables, start=1):
                rows = []
                for row in table:
                    cleaned = [compact_text(cell) for cell in (row or [])]
                    if any(cleaned):
                        rows.append(cleaned)

                if rows:
                    tables.append({
                        "tableIndex": table_index,
                        "rows": rows,
                    })

            result["pages"].append({
                "pageNumber": index,
                "text": text,
                "blocks": word_blocks(words),
                "tables": tables,
                "width": float(page.width),
                "height": float(page.height),
            })

    return result


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        print("Usage: curriculum-extract-pdf.py <pdf-path> [max-pages]", file=sys.stderr)
        sys.exit(2)

    max_pages_arg = int(sys.argv[2]) if len(sys.argv) == 3 and sys.argv[2] else None
    payload = json.dumps(extract(sys.argv[1], max_pages_arg), ensure_ascii=False)
    sys.stdout.buffer.write(payload.encode("utf-8"))
