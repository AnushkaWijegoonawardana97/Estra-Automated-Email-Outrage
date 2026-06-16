from __future__ import annotations

import re
from typing import Any


DEFAULT_TEMPLATE = "{term} near {city} {country}"


def slugify(value: str) -> str:
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def get_country_label(target: dict[str, Any]) -> str:
    state_name = (target.get("stateName") or "").strip()
    if state_name:
        return state_name
    return (target.get("name") or "").strip()


def render_scrape_query(template: str, term: str, city: str, country_label: str) -> str:
    query = (
        template.replace("{term}", term.strip().lower())
        .replace("{city}", city.strip().lower())
        .replace("{country}", country_label.strip().lower())
    )
    return re.sub(r"\s+", " ", query).strip()


def _extract_terms_from_legacy(search_targets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    terms: set[str] = set()
    for target in search_targets:
        for city in target.get("cities", []):
            for query in city.get("searchQueries", []):
                first_word = query.strip().split(" ")[0]
                if first_word:
                    terms.add(first_word.lower())
    if not terms:
        return [
            {"id": "salons", "term": "salons", "enabled": True},
            {"id": "gyms", "term": "gyms", "enabled": True},
        ]
    return [{"id": slugify(term), "term": term, "enabled": True} for term in sorted(terms)]


def _migrate_from_legacy(search_targets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    migrated: list[dict[str, Any]] = []
    for target in search_targets:
        iso2 = (target.get("countryCode") or slugify(target.get("country", ""))).upper()
        migrated.append(
            {
                "id": iso2.lower(),
                "iso2": iso2,
                "name": target.get("country", iso2),
                "enabled": target.get("enabled", True),
                "cities": [
                    {"name": city.get("city", ""), "enabled": city.get("enabled", True)}
                    for city in target.get("cities", [])
                    if city.get("city")
                ],
            }
        )
    return migrated


def migrate_target_markets_config(config: dict[str, Any]) -> dict[str, Any]:
    target_countries = config.get("targetCountries")
    if target_countries is None and config.get("searchTargets"):
        target_countries = _migrate_from_legacy(config["searchTargets"])
    elif target_countries is None:
        target_countries = []

    search_terms = config.get("searchTerms")
    if search_terms is None and config.get("searchTargets"):
        search_terms = _extract_terms_from_legacy(config["searchTargets"])
    elif search_terms is None:
        search_terms = []

    template = config.get("scrapeQueryTemplate") or DEFAULT_TEMPLATE
    if "{term}" not in template or "{city}" not in template or "{country}" not in template:
        template = DEFAULT_TEMPLATE

    return {
        **config,
        "targetCountries": target_countries,
        "searchTerms": search_terms,
        "scrapeQueryTemplate": template,
    }


def build_scrape_jobs(config: dict[str, Any]) -> list[dict[str, str]]:
    normalized = migrate_target_markets_config(config)
    template = normalized.get("scrapeQueryTemplate", DEFAULT_TEMPLATE)
    jobs: list[dict[str, str]] = []

    for target in normalized.get("targetCountries", []):
        if not target.get("enabled"):
            continue

        country_label = get_country_label(target)

        for city in target.get("cities", []):
            if not city.get("enabled"):
                continue

            city_name = city.get("name", "")
            if not city_name:
                continue

            for search_term in normalized.get("searchTerms", []):
                if not search_term.get("enabled"):
                    continue

                term = search_term.get("term", "")
                if not term:
                    continue

                jobs.append(
                    {
                        "query": render_scrape_query(template, term, city_name, country_label),
                        "term": term,
                        "city": city_name,
                        "country": target.get("name", ""),
                        "countryLabel": country_label,
                        "iso2": target.get("iso2", ""),
                    }
                )

    return jobs
