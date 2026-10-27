#Skill Bridge

Skill Bridge includes unit tests, integration suites, fairness validation, and performance benchmarks.

### Fast Unit & Integration Tests

From the project root:

```bash
python run_tests.py
```

Or target specific layers directly from `ai-career-engine/`:

```bash
cd ai-career-engine

# Run Unit Tests only
python run_tests.py unit

# Run Mocked Integration Tests
python run_tests.py integration

# Run All Tests
python run_tests.py all
```

### System Evaluation & Benchmark Suite

Execute the benchmark suite to measure latency, ranking precision, and career-gap fairness:

```bash
cd ai-career-engine
python evaluate.py
```

Evaluation charts will be generated in `ai-career-engine/reports/charts/`:
* `chart_protected_gap_fairness.png`
* `chart_agent_execution_times.png`
* `chart_readiness_distribution.png`
* `chart_skill_gap_prioritization.png`

---

## Protected Career Gap Policy

Skill Bridge enforces an explicit fairness constraint in all ranking and readiness calculations:

$$\text{Readiness}(\text{Candidate with Protected Gap}) \equiv \text{Readiness}(\text{Candidate without Gap})$$

* Any career interruption marked as `protected: true` (such as parental leave, family caregiving, or medical treatment) is isolated from penalty logic in `MatchingEngine` and `ReadinessEngine`.
* Automated regression tests (`tests/integration/test_invariants_mocked.py`) verify this invariant continuously to prevent bias regressions.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`.
3. Ensure all tests pass: `python run_tests.py`.
4. Commit your changes: `git commit -m "Add new capability"`.
5. Push to the branch: `git push origin feature/your-feature-name`.
6. Open a Pull Request.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
