#!/usr/bin/env python3
"""
Imports CSV historical data for Ruzafa and Puerta del Mar into Supabase.

Usage:
  python3 import.py [--ruzafa <path>] [--pdm <path>] [--apply]

Without --apply it just prints summary stats and writes SQL to stdout/files.
With --apply it submits batches to the Supabase Management API.
"""
import argparse
import csv
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")
PAT = os.environ.get("SUPABASE_PAT", "")
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
TODAY = date.today()

if not PROJECT_REF or not PAT:
    print(
        "ERROR: define SUPABASE_PROJECT_REF y SUPABASE_PAT como variables de entorno.\n"
        "  export SUPABASE_PROJECT_REF=tu-project-ref\n"
        "  export SUPABASE_PAT=sbp_xxx",
        file=sys.stderr,
    )
    sys.exit(1)

# Plan name → plan_type enum
PLAN_TYPE_MAP = {
    "fijo": "fixed",
    "flexible": "flexible",
    "20 horas": "hours_20",
    "10 horas": "hours_10",
    "tardes": "evening",
    "tardes ilimitado": "evening",
    "día": "day_pass",
    "dia": "day_pass",
    "medio-día": "half_day_pass",
    "medio-dia": "half_day_pass",
    "medio día": "half_day_pass",
    "medio dia": "half_day_pass",
    "semana": "week_pass",
    "pase semanal": "week_pass",
    "café": "coffee",
    "cafe": "coffee",
    "bono café": "coffee",
    "bono cafe": "coffee",
    "otro": "misc",
    "sala reunión": "misc",
    "sala reunion": "misc",
    "oficina mensual": "office",
    "oficina": "office",
    "oficina virtual": "virtual_office",
    "monitor": "misc",
    "taquilla": "misc",
    "trial": "misc",
}

# Plan types that constitute a recurring subscription (need active sub if latest end_date >= today)
RECURRING_TYPES = {"fixed", "flexible", "hours_20", "hours_10", "evening", "office", "virtual_office"}

# Payment method mapping
PAYMENT_METHOD_MAP = {
    "stripe": "stripe",
    "tarjeta": "card",
    "efectivo": "cash",
    "transferencia": "transfer",
    "sepa": "sepa",
}


_MOJIBAKE_HINTS = ("â¬", "Ã©", "Ã¡", "Ã­", "Ã³", "Ãº", "Ã±", "Ã‰", "Ã‘", "Ã¼", "â€")


def fix_encoding(text: str) -> str:
    """Fix mojibake (UTF-8 misread as Latin-1 then re-saved). Only acts when hints detected."""
    if not text:
        return text
    if not any(h in text for h in _MOJIBAKE_HINTS):
        return text
    try:
        return text.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore")
    except Exception:
        return text


def parse_amount(s: str) -> float:
    """Parse Spanish formatted amount: '1.815,00€' or '21,78€' or '169.70'."""
    if not s:
        return 0.0
    s = s.strip().replace("â¬", "").replace("€", "").replace(" ", "")
    # Remove thousands dots (only when followed by 3 digits and a comma later)
    if "," in s:
        # Spanish: 1.815,00 → 1815.00
        s = s.replace(".", "").replace(",", ".")
    try:
        return round(float(s), 2)
    except ValueError:
        return 0.0


def parse_date(s: str):
    if not s:
        return None
    s = s.strip()
    # Try DD/MM/YYYY or D/M/YYYY
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def normalize_plan(s: str) -> str:
    if not s:
        return "misc"
    key = fix_encoding(s).strip().lower()
    return PLAN_TYPE_MAP.get(key, "misc")


def normalize_method(s: str):
    if not s:
        return None
    key = fix_encoding(s).strip().lower()
    return PAYMENT_METHOD_MAP.get(key)


def sql_escape(s):
    if s is None:
        return "null"
    if isinstance(s, (int, float)):
        return str(s)
    if isinstance(s, date):
        return f"'{s.isoformat()}'"
    return "'" + str(s).replace("'", "''") + "'"


def execute_sql(query: str):
    """Submit a SQL query to the Management API via curl (Cloudflare blocks urllib UA)."""
    import subprocess
    payload = json.dumps({"query": query})
    proc = subprocess.run(
        [
            "curl", "-sS", "-X", "POST",
            "-H", f"Authorization: Bearer {PAT}",
            "-H", "Content-Type: application/json",
            "--data-binary", "@-",
            API,
        ],
        input=payload,
        capture_output=True,
        text=True,
        timeout=180,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr}")
    body = proc.stdout
    try:
        result = json.loads(body)
    except json.JSONDecodeError:
        raise RuntimeError(f"Non-JSON response: {body[:500]}")
    if isinstance(result, dict) and result.get("message"):
        raise RuntimeError(f"API error: {result['message'][:500]}")
    return result


def fetch_coworking_ids():
    """Get coworking ids by name."""
    rows = execute_sql("select id, name from coworkings;")
    return {r["name"]: r["id"] for r in rows}


def parse_csv(path: Path, coworking_id: str, coworking_name: str):
    """Read a CSV and return list of payment dicts + unique client names."""
    rows = []
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            client = fix_encoding((raw.get("Cliente") or "").strip())
            if not client:
                continue
            d = parse_date(raw.get("Fecha Pago", ""))
            if not d:
                continue
            amount = parse_amount(raw.get("Total", ""))
            plan_label = fix_encoding((raw.get("Plan") or "").strip())
            plan_type = normalize_plan(plan_label)
            method = normalize_method(raw.get("Medio de Pago", ""))
            end_d = parse_date(raw.get("Fecha Fin", ""))
            rows.append({
                "client": client,
                "coworking_id": coworking_id,
                "coworking_name": coworking_name,
                "paid_at": d,
                "amount_gross": amount,
                "plan_label": plan_label,
                "plan_type": plan_type,
                "method": method,
                "end_date": end_d,
            })
    return rows


def build_clients(all_rows):
    """One client per (coworking_id, name)."""
    clients = {}
    for r in all_rows:
        key = (r["coworking_id"], r["client"])
        if key not in clients:
            clients[key] = {
                "name": r["client"],
                "coworking_id": r["coworking_id"],
                "first_payment": r["paid_at"],
                "last_payment": r["paid_at"],
                "is_company": is_company_name(r["client"]),
            }
        else:
            if r["paid_at"] < clients[key]["first_payment"]:
                clients[key]["first_payment"] = r["paid_at"]
            if r["paid_at"] > clients[key]["last_payment"]:
                clients[key]["last_payment"] = r["paid_at"]
    return clients


def is_company_name(name: str) -> bool:
    """Heuristic: capital letters + SL/SA/SLU etc → company."""
    upper = sum(1 for c in name if c.isupper())
    if any(token in name for token in [" SL", " SLU", " S.L", " S.A", " SA ", "S.A.", "S.L.", " SARL", " GMBH", " LTD", " LLC", " INC", " S.R.L", "S.A.U", " B.V"]):
        return True
    if upper >= 5 and upper / max(len(name), 1) > 0.5:
        return True
    return False


def find_active_subs(all_rows, clients):
    """For each client, find latest recurring (monthly) payment whose end_date >= today."""
    # group by (cw, client)
    by_client = defaultdict(list)
    for r in all_rows:
        if r["plan_type"] not in RECURRING_TYPES:
            continue
        if not r["end_date"]:
            continue
        key = (r["coworking_id"], r["client"])
        by_client[key].append(r)

    actives = []
    for key, rows in by_client.items():
        rows.sort(key=lambda r: (r["end_date"], r["paid_at"]))
        latest = rows[-1]
        if latest["end_date"] >= TODAY:
            actives.append(latest)
    return actives


def chunked(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def insert_clients_sql(clients):
    """Generate INSERT for clients, returning a map (cw_id, name) → temp_uuid placeholder.
    Actually we use a CTE-less approach: insert and return ids.
    For batching we'll use VALUES + RETURNING."""
    values = []
    for c in clients.values():
        client_type = "company" if c["is_company"] else "individual"
        values.append(
            "(" + ",".join([
                sql_escape(c["coworking_id"]),
                sql_escape(client_type),
                sql_escape(c["name"]),
                sql_escape(c["name"]) if c["is_company"] else "null",
                "'pending'",
                sql_escape(c["first_payment"]),
                "'standard'",
            ]) + ")"
        )
    return values


def build_payment_value(p, client_id):
    return "(" + ",".join([
        sql_escape(client_id),
        sql_escape(p["coworking_id"]),
        sql_escape(p["paid_at"].replace(day=1)),
        sql_escape(p["plan_label"] or "Pago"),
        sql_escape(p["amount_gross"]),
        sql_escape(p["amount_gross"]),
        "'paid'",
        sql_escape(p["paid_at"]),
        sql_escape(p["paid_at"]),
        sql_escape(p["method"]) if p["method"] else "null",
    ]) + ")"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ruzafa", default="ruzafa.csv")
    ap.add_argument("--pdm", default="puerta_del_mar.csv")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    print("Fetching coworking IDs...", file=sys.stderr)
    cw_ids = fetch_coworking_ids()
    if "Ruzafa" not in cw_ids or "Puerta del Mar" not in cw_ids:
        print("ERROR: missing coworking ids", cw_ids, file=sys.stderr)
        return 1

    base = Path(__file__).resolve().parent
    print("Parsing CSVs...", file=sys.stderr)
    rows_r = parse_csv(base / args.ruzafa, cw_ids["Ruzafa"], "Ruzafa") if (base / args.ruzafa).exists() else []
    rows_p = parse_csv(base / args.pdm, cw_ids["Puerta del Mar"], "Puerta del Mar") if (base / args.pdm).exists() else []
    all_rows = rows_r + rows_p
    print(f"  Ruzafa: {len(rows_r)} rows", file=sys.stderr)
    print(f"  PDM:    {len(rows_p)} rows", file=sys.stderr)

    clients = build_clients(all_rows)
    print(f"  Unique clients: {len(clients)}", file=sys.stderr)

    actives = find_active_subs(all_rows, clients)
    print(f"  Active subscriptions: {len(actives)}", file=sys.stderr)

    cash_total = sum(r["amount_gross"] for r in all_rows if r["method"] == "cash")
    print(f"  Total cash payments: {cash_total:.2f}€", file=sys.stderr)

    if not args.apply:
        # Print 5 sample rows of each
        print("\n--- Sample Ruzafa rows ---", file=sys.stderr)
        for r in rows_r[:3]:
            print(r, file=sys.stderr)
        print("\n--- Sample PDM rows ---", file=sys.stderr)
        for r in rows_p[:3]:
            print(r, file=sys.stderr)
        print("\n--- Sample active subs ---", file=sys.stderr)
        for a in actives[:5]:
            print(f"  {a['client']} ({a['coworking_name']}) — {a['plan_label']} → {a['end_date']}", file=sys.stderr)
        print("\nRe-run with --apply to import.", file=sys.stderr)
        return 0

    # === APPLY MODE ===
    print("\nFetching existing clients (to avoid duplicates)...", file=sys.stderr)
    client_id_map = {}  # (cw, name) → uuid
    existing = execute_sql("select id, name, coworking_id from clients;")
    for r in existing:
        client_id_map[(r["coworking_id"], r["name"])] = r["id"]
    print(f"  Found {len(client_id_map)} existing clients in DB", file=sys.stderr)

    # Insert only missing clients
    to_insert = [c for c in clients.values() if (c["coworking_id"], c["name"]) not in client_id_map]
    print(f"  New clients to insert: {len(to_insert)}", file=sys.stderr)

    for batch in chunked(to_insert, 200):
        values = []
        for c in batch:
            client_type = "company" if c["is_company"] else "individual"
            values.append(
                "(" + ",".join([
                    sql_escape(c["coworking_id"]),
                    sql_escape(client_type),
                    sql_escape(c["name"]),
                    sql_escape(c["name"]) if c["is_company"] else "null",
                    "'pending'::client_status",
                    sql_escape(c["first_payment"]),
                    "'standard'::tax_treatment",
                ]) + ")"
            )
        sql = (
            "insert into clients (coworking_id, client_type, name, company_name, status, start_date, tax_treatment) values "
            + ",".join(values)
            + " returning id, name, coworking_id;"
        )
        rows = execute_sql(sql)
        for r in rows:
            client_id_map[(r["coworking_id"], r["name"])] = r["id"]

    # Wipe ALL payments/invoices/subscriptions for the coworkings we're importing —
    # one query per coworking is far cheaper than chunked client_id lists.
    print("\nClearing existing payments/invoices/subscriptions...", file=sys.stderr)
    cw_ids_in_scope = sorted({c["coworking_id"] for c in clients.values()})
    cw_csv = ",".join(f"'{i}'" for i in cw_ids_in_scope)
    if cw_csv:
        execute_sql(f"delete from subscriptions where coworking_id in ({cw_csv});")
        execute_sql(f"delete from payments where coworking_id in ({cw_csv});")
        execute_sql(f"delete from invoices where coworking_id in ({cw_csv});")

    # Insert payments + invoices in tandem (one invoice per paid payment).
    print("\nInserting payments + invoices...", file=sys.stderr)
    paid_total = 0
    inv_total = 0
    invoice_seq_by_year = defaultdict(int)
    for batch in chunked(all_rows, 300):
        # First, insert invoices and capture ids
        inv_values = []
        inv_meta = []  # parallel list of (cw_id, client_id, paid_at, plan_label, gross, method)
        for p in batch:
            cid = client_id_map.get((p["coworking_id"], p["client"]))
            if not cid:
                continue
            gross = p["amount_gross"]
            # Heuristic: Café = IVA 10%, Otro/misc no IVA, others 21%
            plan_low = (p["plan_label"] or "").lower()
            if p["plan_type"] == "coffee":
                vat_rate = 0.10
            elif p["plan_type"] == "misc":
                vat_rate = 0.0
            else:
                vat_rate = 0.21
            if vat_rate > 0:
                base = round(gross / (1 + vat_rate), 2)
                vat = round(gross - base, 2)
            else:
                base = gross
                vat = 0.0
            year = p["paid_at"].year
            invoice_seq_by_year[year] += 1
            inv_num = f"IMP-{year}-{invoice_seq_by_year[year]:05d}"
            inv_values.append("(" + ",".join([
                sql_escape(cid),
                sql_escape(p["coworking_id"]),
                sql_escape(p["paid_at"].replace(day=1)),
                sql_escape(inv_num),
                sql_escape(p["plan_label"] or "Pago"),
                sql_escape(base),
                sql_escape(vat),
                sql_escape(gross),
                "'paid'::invoice_status",
                sql_escape(p["paid_at"]),
                sql_escape(p["paid_at"]),
            ]) + ")")
            inv_meta.append(p)

        if not inv_values:
            continue

        sql = (
            "insert into invoices (client_id, coworking_id, month, invoice_number, concept, taxable_base, vat_amount, total_amount, status, issue_date, paid_date) values "
            + ",".join(inv_values)
            + " returning id;"
        )
        inv_rows = execute_sql(sql)
        inv_total += len(inv_rows)

        # Now insert payments with invoice_id linked
        pay_values = []
        for inv_row, p in zip(inv_rows, inv_meta):
            cid = client_id_map.get((p["coworking_id"], p["client"]))
            pay_values.append("(" + ",".join([
                sql_escape(cid),
                sql_escape(p["coworking_id"]),
                sql_escape(p["paid_at"].replace(day=1)),
                sql_escape(p["plan_label"] or "Pago"),
                sql_escape(p["amount_gross"]),
                sql_escape(p["amount_gross"]),
                "'paid'::payment_status",
                sql_escape(p["paid_at"]),
                sql_escape(p["paid_at"]),
                sql_escape(p["method"]) if p["method"] else "null",
                sql_escape(inv_row["id"]),
            ]) + ")")
        sql = (
            "insert into payments (client_id, coworking_id, month, concept, expected_amount, paid_amount, status, expected_payment_date, paid_at, payment_method, invoice_id) values "
            + ",".join(pay_values)
            + ";"
        )
        execute_sql(sql)
        paid_total += len(pay_values)

    print(f"  Inserted {paid_total} payments + {inv_total} invoices", file=sys.stderr)

    # Insert active subscriptions for clients with a recurring monthly sub still valid
    print("\nInserting active subscriptions...", file=sys.stderr)
    active_client_ids = set()
    sub_values = []
    for a in actives:
        cid = client_id_map.get((a["coworking_id"], a["client"]))
        if not cid:
            continue
        active_client_ids.add(cid)
        net = round(a["amount_gross"] / 1.21, 2)
        sub_values.append("(" + ",".join([
            sql_escape(cid),
            sql_escape(a["coworking_id"]),
            sql_escape(a["plan_label"] or "Plan"),
            sql_escape(net),
            sql_escape(net),
            "21",
            "'standard'::tax_treatment",
            sql_escape(a["paid_at"]),
            sql_escape(a["end_date"]),
            "'active'::subscription_status",
            sql_escape(a["method"]) if a["method"] else "null",
        ]) + ")")

    if sub_values:
        execute_sql("alter table subscriptions disable trigger trg_autocreate_payment;")
        try:
            for batch in chunked(sub_values, 200):
                sql = (
                    "insert into subscriptions (client_id, coworking_id, plan_name, base_price, final_price, vat_rate, tax_treatment, start_date, end_date, status, payment_method) values "
                    + ",".join(batch)
                    + ";"
                )
                execute_sql(sql)
        finally:
            execute_sql("alter table subscriptions enable trigger trg_autocreate_payment;")
    print(f"  Inserted {len(sub_values)} active subscriptions", file=sys.stderr)

    # Update client status:
    #  - active   = currently has a recurring subscription valid today
    #  - inactive = had a recurring (monthly/office) plan in the past, now expired
    #  - casual   = never had a recurring plan (only day pass / week / coffee / misc)
    print("\nSetting client status (active / inactive / casual)...", file=sys.stderr)

    # Build set of clients who EVER had a recurring plan in the CSV
    ever_recurring_keys = set()
    for r in all_rows:
        if r["plan_type"] in RECURRING_TYPES:
            ever_recurring_keys.add((r["coworking_id"], r["client"]))
    ever_recurring_ids = {client_id_map[k] for k in ever_recurring_keys if k in client_id_map}

    all_imported_ids = list(client_id_map.values())
    inactive_ids = [i for i in all_imported_ids if i not in active_client_ids and i in ever_recurring_ids]
    casual_ids = [i for i in all_imported_ids if i not in active_client_ids and i not in ever_recurring_ids]

    if active_client_ids:
        for batch in chunked(list(active_client_ids), 500):
            ids_csv = ",".join(f"'{i}'" for i in batch)
            execute_sql(f"update clients set status = 'active'::client_status where id in ({ids_csv});")
    if inactive_ids:
        for batch in chunked(inactive_ids, 500):
            ids_csv = ",".join(f"'{i}'" for i in batch)
            execute_sql(f"update clients set status = 'inactive'::client_status where id in ({ids_csv});")
    if casual_ids:
        for batch in chunked(casual_ids, 500):
            ids_csv = ",".join(f"'{i}'" for i in batch)
            execute_sql(f"update clients set status = 'casual'::client_status where id in ({ids_csv});")
    print(f"  Active: {len(active_client_ids)} · Inactive: {len(inactive_ids)} · Casual: {len(casual_ids)}", file=sys.stderr)

    print("\n✓ Import complete.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
