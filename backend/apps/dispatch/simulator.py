from __future__ import annotations

import random
from typing import Any

SIMULATION_STEPS: dict[str, list[str]] = {
    "SEM": [
        "Sample loading",
        "Vacuum stabilization",
        "Beam calibration",
        "Surface scan",
        "Defect image acquisition",
        "Defect counting",
        "Result generation",
    ],
    "THIN_FILM": [
        "Sample alignment",
        "Optical calibration",
        "Multi-point measurement",
        "Thickness calculation",
        "Uniformity analysis",
        "Result generation",
    ],
    "ETCH": [
        "Chamber preparation",
        "Gas flow stabilization",
        "Plasma ignition",
        "Etch execution",
        "Cooldown",
        "Post-etch measurement",
    ],
    "SHEET_RES": [
        "Probe alignment",
        "Contact verification",
        "Current injection",
        "Voltage measurement",
        "Resistance calculation",
        "Uniformity analysis",
    ],
    "THERMAL": [
        "Sample loading",
        "Nitrogen purge",
        "Temperature ramp-up",
        "Temperature hold",
        "Cooldown",
        "Final process log generation",
    ],
}


def recipe_family(recipe_code: str, experiment_name: str) -> str:
    text = f"{recipe_code} {experiment_name}".upper()
    if "SEM" in text or "DEFECT" in text:
        return "SEM"
    if "THIN" in text or "FILM" in text or "ELLIPS" in text:
        return "THIN_FILM"
    if "ETCH" in text:
        return "ETCH"
    if "SHEET" in text or "PROBE" in text or "RESIST" in text:
        return "SHEET_RES"
    if "THERM" in text or "ANNEAL" in text:
        return "THERMAL"
    return "SEM"


def build_steps(recipe_code: str, experiment_name: str) -> list[str]:
    return SIMULATION_STEPS[recipe_family(recipe_code, experiment_name)]


def generate_result(recipe_code: str, experiment_name: str) -> tuple[str, dict[str, Any], str]:
    family = recipe_family(recipe_code, experiment_name)
    if family == "SEM":
        defects = random.randint(4, 40)
        data = {
            "defect_count": defects,
            "defect_density_per_cm2": round(defects / random.uniform(80, 140), 3),
            "critical_defect_found": defects > 28,
            "image_quality_score": round(random.uniform(0.88, 0.99), 3),
        }
        return "SEM defect inspection completed", data, "fail" if defects > 34 else "pass"
    if family == "THIN_FILM":
        avg = random.uniform(48, 56)
        data = {
            "average_thickness_nm": round(avg, 2),
            "min_thickness_nm": round(avg - random.uniform(0.6, 1.9), 2),
            "max_thickness_nm": round(avg + random.uniform(0.6, 1.9), 2),
            "uniformity_percent": round(random.uniform(95.0, 99.4), 2),
        }
        return "Thin film thickness measurement completed", data, "pass"
    if family == "ETCH":
        actual = random.uniform(116, 123)
        data = {
            "etch_rate_nm_per_min": round(random.uniform(36, 41), 2),
            "target_depth_nm": 120,
            "actual_depth_nm": round(actual, 2),
            "process_deviation_percent": round(abs(actual - 120) / 120 * 100, 2),
        }
        return "Etch rate test completed", data, "pass" if abs(actual - 120) <= 4 else "fail"
    if family == "SHEET_RES":
        data = {
            "sheet_resistance_ohm_sq": round(random.uniform(38, 45), 2),
            "uniformity_percent": round(random.uniform(95, 99), 2),
            "measurement_points": 49,
        }
        return "Sheet resistance measurement completed", data, "pass"
    data = {
        "target_temperature_c": 950,
        "actual_peak_temperature_c": round(random.uniform(946, 953), 2),
        "hold_time_sec": 60,
        "temperature_stability_percent": round(random.uniform(98.5, 99.8), 2),
    }
    return "Thermal annealing simulation completed", data, "pass"
