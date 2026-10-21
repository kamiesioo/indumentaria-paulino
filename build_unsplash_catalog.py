#!/usr/bin/env python3
"""
Catálogo de ropa vintage contemporánea (80s, 90s, 2000s) con fotos de Unsplash.

Requiere una Access Key gratuita (https://unsplash.com/developers -> New Application).
La key se pasa por variable de entorno para no dejarla escrita en ningún archivo:

    export UNSPLASH_ACCESS_KEY="tu_key"
    python3 build_unsplash_catalog.py --per-query 12 --out site/data

Cumple las pautas de Unsplash: las imágenes se muestran enlazadas desde su CDN (no se descargan)
y cada foto lleva crédito al fotógrafo con enlace. Una app en modo demo permite 50 consultas/hora;
este script hace una por cada término de búsqueda.
Escribe catalog.js / catalog.json / catalog.csv con el mismo formato que usa el sitio.
"""
import argparse, csv, json, os, sys, urllib.parse, urllib.request

API = "https://api.unsplash.com/search/photos"
UTM = "utm_source=indumentaria_paulino&utm_medium=referral"

# (término de búsqueda, categoría, época)
QUERIES = [
    ("vintage dress 90s", "Dress", "Años 90"),
    ("vintage denim jacket", "Jacket", "Años 80-90"),
    ("vintage windbreaker 90s", "Jacket", "Años 90"),
    ("vintage coat thrift", "Coat", "Años 80"),
    ("vintage knit sweater", "Sweater", "Años 80-90"),
    ("vintage band t-shirt", "Shirt", "Años 90"),
    ("vintage blouse retro", "Blouse", "Años 70-80"),
    ("vintage jeans 90s", "Trousers", "Años 90"),
    ("vintage skirt retro", "Skirt", "Años 80"),
    ("vintage sneakers retro", "Shoes", "Años 90"),
    ("vintage hat cap", "Hat", "Años 80-90"),
    ("thrift store clothes rack vintage", "Accessories", "Años 80-2000"),
]


def search(key, q, n):
    params = urllib.parse.urlencode({"query": q, "per_page": n, "orientation": "portrait", "content_filter": "high"})
    req = urllib.request.Request(f"{API}?{params}", headers={"Authorization": f"Client-ID {key}", "Accept-Version": "v1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())["results"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-query", type=int, default=12, help="fotos por término (máx. 30)")
    ap.add_argument("--out", default="site/data")
    args = ap.parse_args()
    key = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not key:
        sys.exit("Falta UNSPLASH_ACCESS_KEY (export UNSPLASH_ACCESS_KEY=\"...\").")

    items, seen = [], set()
    for q, cat, era in QUERIES:
        try:
            res = search(key, q, min(args.per_query, 30))
        except Exception as e:
            print(f"! '{q}': {e}", file=sys.stderr)
            continue
        got = 0
        for p in res:
            if p["id"] in seen:
                continue
            seen.add(p["id"])
            got += 1
            u = p["user"]
            items.append({
                "id": p["id"],
                "title": (p.get("description") or p.get("alt_description") or q).strip().capitalize()[:90],
                "category": cat,
                "date": era,
                "year_begin": None, "year_end": None,
                "culture": "", "designer": u["name"], "medium": "",
                "credit_line": f"Foto de {u['name']} en Unsplash",
                "image_full": p["urls"]["regular"],
                "image_web": p["urls"]["small"],
                "image_extra": [],
                "source_url": f"{p['links']['html']}?{UTM}",
                "license": "Unsplash License",
            })
        print(f"'{q}': {got} fotos")

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    with open(os.path.join(args.out, "catalog.js"), "w", encoding="utf-8") as f:
        f.write("window.CATALOG = " + json.dumps(items, ensure_ascii=False) + ";\n")
    with open(os.path.join(args.out, "catalog.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["id", "title", "category", "date", "designer", "credit_line", "image_web", "source_url", "license"], extrasaction="ignore")
        w.writeheader(); w.writerows(items)
    print(f"{len(items)} fotos -> {os.path.abspath(args.out)}")


if __name__ == "__main__":
    main()
