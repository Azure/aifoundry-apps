from typing import Dict, List, Any
import logging
from ..models.schemas import ConstitutionalValidationRequest, ConstitutionalValidationResponse

logger = logging.getLogger(__name__)

class ConstitutionalService:
    def __init__(self):
        self.constitutional_articles = {
            "library_first": {
                "title": "Library-First Principle (Article I)",
                "description": "Every feature begins as standalone library",
                "checks": [
                    "Using existing libraries over custom implementations",
                    "Clear module boundaries defined",
                    "Minimal dependencies specified"
                ]
            },
            "cli_interface": {
                "title": "CLI Interface Mandate (Article II)", 
                "description": "All libraries expose CLI interfaces",
                "checks": [
                    "Command-line interface defined",
                    "All functionality accessible via CLI",
                    "Proper argument parsing implemented"
                ]
            },
            "test_first": {
                "title": "Test-First Imperative (Article III)",
                "description": "No implementation before comprehensive tests",
                "checks": [
                    "Unit tests defined before implementation",
                    "Test coverage plan specified",
                    "Integration tests included"
                ]
            },
            "simplicity": {
                "title": "Simplicity Gates (Article VII)",
                "description": "Maximum 3 projects, no future-proofing",
                "checks": [
                    "Using ≤3 projects",
                    "No future-proofing patterns",
                    "Simple, direct implementation approach"
                ]
            },
            "anti_abstraction": {
                "title": "Anti-Abstraction Gate (Article VIII)",
                "description": "Use frameworks directly, minimal wrapping",
                "checks": [
                    "Using framework directly",
                    "Single model representation",
                    "Minimal abstraction layers"
                ]
            },
            "integration_first": {
                "title": "Integration-First Gate (Article IX)",
                "description": "Real environments over mocks",
                "checks": [
                    "Contracts defined",
                    "Contract tests written",
                    "Real environment testing planned"
                ]
            }
        }
    
    def validate_plan(self, request: ConstitutionalValidationRequest) -> ConstitutionalValidationResponse:
        violations = []
        recommendations = []
        gates_passed = {}
        
        plan_text = request.plan.lower()
        tech_stack = request.tech_stack.lower()
        architecture = (request.architecture or "").lower()
        
        library_first_passed = self._check_library_first(plan_text, tech_stack)
        gates_passed["library_first"] = library_first_passed
        if not library_first_passed:
            violations.append({
                "article": "Article I",
                "violation": "Plan does not prioritize existing libraries over custom implementations"
            })
            recommendations.append("Consider using established libraries and frameworks instead of building custom solutions")
        
        cli_interface_passed = self._check_cli_interface(plan_text)
        gates_passed["cli_interface"] = cli_interface_passed
        if not cli_interface_passed:
            violations.append({
                "article": "Article II", 
                "violation": "No CLI interface specified for the implementation"
            })
            recommendations.append("Add command-line interface to make functionality accessible via CLI")
        
        test_first_passed = self._check_test_first(plan_text)
        gates_passed["test_first"] = test_first_passed
        if not test_first_passed:
            violations.append({
                "article": "Article III",
                "violation": "Tests are not prioritized before implementation"
            })
            recommendations.append("Define comprehensive test suite before beginning implementation")
        
        simplicity_passed = self._check_simplicity(plan_text, tech_stack)
        gates_passed["simplicity"] = simplicity_passed
        if not simplicity_passed:
            violations.append({
                "article": "Article VII",
                "violation": "Plan appears to involve too many projects or future-proofing"
            })
            recommendations.append("Simplify approach to use ≤3 projects and avoid future-proofing patterns")
        
        anti_abstraction_passed = self._check_anti_abstraction(plan_text, architecture)
        gates_passed["anti_abstraction"] = anti_abstraction_passed
        if not anti_abstraction_passed:
            violations.append({
                "article": "Article VIII",
                "violation": "Plan includes unnecessary abstraction layers"
            })
            recommendations.append("Use frameworks directly with minimal wrapping and abstraction")
        
        integration_first_passed = self._check_integration_first(plan_text)
        gates_passed["integration_first"] = integration_first_passed
        if not integration_first_passed:
            violations.append({
                "article": "Article IX",
                "violation": "Plan does not emphasize real environment testing"
            })
            recommendations.append("Define contracts and plan for real environment testing over mocks")
        
        is_compliant = len(violations) == 0
        
        return ConstitutionalValidationResponse(
            is_compliant=is_compliant,
            violations=violations,
            recommendations=recommendations,
            gates_passed=gates_passed
        )
    
    def _check_library_first(self, plan_text: str, tech_stack: str) -> bool:
        library_indicators = [
            "library", "framework", "package", "npm", "pip", "maven", "gradle",
            "existing", "established", "proven", "standard", "popular"
        ]
        custom_indicators = [
            "custom", "build from scratch", "implement our own", "create new",
            "write our own", "develop custom"
        ]
        
        library_score = sum(1 for indicator in library_indicators if indicator in plan_text or indicator in tech_stack)
        custom_score = sum(1 for indicator in custom_indicators if indicator in plan_text)
        
        return library_score > custom_score
    
    def _check_cli_interface(self, plan_text: str) -> bool:
        cli_indicators = [
            "cli", "command line", "command-line", "terminal", "console",
            "script", "executable", "command", "args", "arguments"
        ]
        return any(indicator in plan_text for indicator in cli_indicators)
    
    def _check_test_first(self, plan_text: str) -> bool:
        test_indicators = [
            "test", "testing", "unit test", "integration test", "test-driven",
            "tdd", "test suite", "test coverage", "jest", "pytest", "junit"
        ]
        return any(indicator in plan_text for indicator in test_indicators)
    
    def _check_simplicity(self, plan_text: str, tech_stack: str) -> bool:
        complexity_indicators = [
            "microservice", "distributed", "scalable", "enterprise", "future-proof",
            "extensible", "pluggable", "configurable", "flexible architecture"
        ]
        
        tech_components = len([t.strip() for t in tech_stack.split(',') if t.strip()])
        
        complexity_score = sum(1 for indicator in complexity_indicators if indicator in plan_text)
        
        return tech_components <= 3 and complexity_score <= 1
    
    def _check_anti_abstraction(self, plan_text: str, architecture: str) -> bool:
        abstraction_indicators = [
            "abstract", "interface", "wrapper", "adapter", "facade", "proxy",
            "factory", "builder", "strategy", "observer", "decorator"
        ]
        direct_indicators = [
            "direct", "simple", "straightforward", "minimal", "basic"
        ]
        
        abstraction_score = sum(1 for indicator in abstraction_indicators if indicator in plan_text or indicator in architecture)
        direct_score = sum(1 for indicator in direct_indicators if indicator in plan_text or indicator in architecture)
        
        return direct_score >= abstraction_score
    
    def _check_integration_first(self, plan_text: str) -> bool:
        integration_indicators = [
            "integration", "contract", "real environment", "end-to-end", "e2e",
            "api test", "integration test", "contract test", "real data"
        ]
        mock_indicators = [
            "mock", "stub", "fake", "dummy", "test double"
        ]
        
        integration_score = sum(1 for indicator in integration_indicators if indicator in plan_text)
        mock_score = sum(1 for indicator in mock_indicators if indicator in plan_text)
        
        return integration_score >= mock_score
