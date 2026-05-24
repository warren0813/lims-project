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


def generate_live_metrics(
    recipe_code: str,
    experiment_name: str,
    progress: float,
    wafer_count: int = 0,
) -> dict[str, Any]:
    family = recipe_family(recipe_code, experiment_name)
    pct = max(0.0, min(float(progress or 0), 100.0))
    phase = pct / 100.0
    wobble = ((int(pct) % 9) - 4) * 0.08
    base = {
        "progress_percent": round(pct, 2),
        "wafer_count": wafer_count,
        "tool_load_percent": round(min(100, 18 + wafer_count * 9 + pct * 0.55), 1),
    }
    if family == "SEM":
        base.update(
            {
                "chamber_pressure_pa": round(max(0.0008, 0.09 * (1 - phase) + 0.0012), 5),
                "beam_voltage_kv": round(5 + min(1.2, phase * 1.2), 2),
                "stage_temperature_c": round(24 + phase * 3 + wobble, 1),
                "scan_rate_fps": round(8 + phase * 18, 1),
            }
        )
    elif family == "THIN_FILM":
        base.update(
            {
                "stage_temperature_c": round(25 + phase * 2 + wobble, 1),
                "optical_signal_percent": round(71 + phase * 22, 1),
                "measurement_points_done": int(49 * phase),
                "fit_confidence_percent": round(88 + phase * 10, 1),
            }
        )
    elif family == "ETCH":
        base.update(
            {
                "chamber_temperature_c": round(32 + phase * 38 + wobble, 1),
                "rf_power_w": round(90 + phase * 160, 1),
                "gas_flow_sccm": round(42 + phase * 18, 1),
                "chamber_pressure_pa": round(9.5 + phase * 2.5, 2),
            }
        )
    elif family == "SHEET_RES":
        base.update(
            {
                "stage_temperature_c": round(24 + phase * 1.8 + wobble, 1),
                "probe_force_g": round(38 + phase * 4, 1),
                "measurement_points_done": int(49 * phase),
                "contact_resistance_ohm": round(0.18 - min(0.08, phase * 0.08), 3),
            }
        )
    else:
        base.update(
            {
                "chamber_temperature_c": round(25 + phase * 925 + wobble, 1),
                "nitrogen_flow_slm": round(18 + phase * 4, 1),
                "thermal_stability_percent": round(82 + phase * 17, 1),
                "hold_elapsed_percent": round(max(0, phase - 0.35) / 0.65 * 100, 1),
            }
        )
    return base


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
