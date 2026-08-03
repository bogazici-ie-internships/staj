#!/usr/bin/env python3
"""Validate the public internship campaign contract before site publication."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml


class ContractError(ValueError):
    """Raised when Website and Apps Script campaign settings are unsafe."""


REQUIRED_CAMPAIGN_FIELDS = {
    "contract_version",
    "campaign_id",
    "etiket",
    "year_done",
    "semester",
    "staj_baslangic",
    "staj_bitis",
    "teslim_kilit",
    "gec_teslim_gun",
}

JS_MAPPING = {
    "CONTRACT_VERSION": "contract_version",
    "CAMPAIGN_ID": "campaign_id",
    "CURRENT_TERM": "etiket",
    "YEAR_DONE": "year_done",
    "SEMESTER": "semester",
    "INTERNSHIP_START": "staj_baslangic",
    "INTERNSHIP_END": "staj_bitis",
    "DEADLINE": "teslim_kilit",
    "LATE_GRACE_DAYS": "gec_teslim_gun",
}


def _iso(value: Any) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


def _parse_js_value(source: str, key: str) -> Any:
    match = re.search(
        rf"^\s*{re.escape(key)}\s*:\s*(?P<value>[^,\n]+)",
        source,
        flags=re.MULTILINE,
    )
    if not match:
        raise ContractError(f"Code.gs CONFIG alanı eksik: {key}")
    raw = match.group("value").strip()
    if raw[:1] in {"'", '"'} and raw[-1:] == raw[:1]:
        return raw[1:-1]
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    raise ContractError(f"Code.gs CONFIG değeri sabit olmalı: {key}")


def validate(settings_path: Path, code_path: Path | None = None) -> dict[str, Any]:
    settings = yaml.safe_load(settings_path.read_text(encoding="utf-8")) or {}
    campaign = settings.get("donem") or {}
    missing = sorted(REQUIRED_CAMPAIGN_FIELDS - campaign.keys())
    if missing:
        raise ContractError("Eksik campaign alanları: " + ", ".join(missing))

    if campaign["contract_version"] != 1:
        raise ContractError("contract_version tam sayı 1 olmalı")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(campaign["campaign_id"])):
        raise ContractError("campaign_id küçük harfli, tireli ve kalıcı olmalı")
    if campaign["semester"] not in {"Summer", "Winter"}:
        raise ContractError("semester yalnız Summer veya Winter olabilir")
    if int(campaign["year_done"]) < 2000:
        raise ContractError("year_done geçerli bir yıl olmalı")
    if int(campaign["gec_teslim_gun"]) < 0:
        raise ContractError("gec_teslim_gun negatif olamaz")

    for key in ("staj_baslangic", "staj_bitis"):
        try:
            date.fromisoformat(_iso(campaign[key]))
        except ValueError as exc:
            raise ContractError(f"{key} YYYY-MM-DD biçiminde olmalı") from exc

    try:
        datetime.strptime(str(campaign["teslim_kilit"]), "%Y-%m-%d %H:%M")
    except ValueError as exc:
        raise ContractError("teslim_kilit YYYY-MM-DD HH:MM biçiminde olmalı") from exc

    if code_path is not None:
        source = code_path.read_text(encoding="utf-8")
        for js_key, campaign_key in JS_MAPPING.items():
            js_value = _parse_js_value(source, js_key)
            expected = campaign[campaign_key]
            if _iso(js_value) != _iso(expected):
                raise ContractError(
                    f"Website/Code.gs uyuşmazlığı: {campaign_key}="
                    f"{expected!r}, {js_key}={js_value!r}"
                )
        for required_source in ("publicContract_", "assertCampaign_", "_submission.json"):
            if required_source not in source:
                raise ContractError(f"Code.gs sözleşme davranışı eksik: {required_source}")

    return dict(campaign)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--settings", type=Path, required=True)
    parser.add_argument("--code", type=Path)
    args = parser.parse_args(argv)
    try:
        campaign = validate(args.settings, args.code)
    except (ContractError, OSError, yaml.YAMLError) as exc:
        print(f"campaign contract invalid: {exc}", file=sys.stderr)
        return 1
    print(
        "campaign contract valid: "
        f"v{campaign['contract_version']} {campaign['campaign_id']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
