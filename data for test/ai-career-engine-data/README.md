# AI Career Engine Dummy Data

Synthetic, deterministic test data for the agent/engine layer.

## Files

- `candidates.json` — 5 candidate profiles with skills, projects, education, certifications and career gaps.
- `target_roles.json` — ML Engineer, Data Analyst and Backend Developer role requirements.
- `courses.json` — 10 learning resources mapped to skills.
- `opportunities.json` — 5 synthetic jobs/internships for matching tests.
- `jobs.json` — synthetic job postings for market-demand calculations.
- `market_history.json` — two-period aggregate skill-demand data.
- `test_scenarios.json` — expected behavioral outcomes and regression cases.

## Important fairness case

`C001` contains a 13-month `parental_leave` gap with:

```json
"protected": true
```

The readiness and opportunity engines must not reduce scores because of this protected interruption.

## Data contract

The data is intentionally synthetic. It is for unit/integration testing only and must not be presented as real labor-market evidence.
