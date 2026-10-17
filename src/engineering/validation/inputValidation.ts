export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateShaftInputs(inputs: {
  diameterMm?: number;
  lengthMm?: number;
  torqueNm?: number;
  forceN?: number;
  rpm?: number;
  safetyFactor?: number;
  yieldStrengthMPa?: number;
  elasticModulusGPa?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Diameter check
  if (inputs.diameterMm !== undefined) {
    if (isNaN(inputs.diameterMm) || inputs.diameterMm <= 0) {
      errors.push('Diameter must be greater than 0 mm (positive non-zero).');
    } else if (inputs.diameterMm < 5) {
      warnings.push(`Diameter (${inputs.diameterMm} mm) is exceptionally small for industrial power transmission.`);
    } else if (inputs.diameterMm > 1000) {
      warnings.push(`Diameter (${inputs.diameterMm} mm) is unusually large. Verify units.`);
    }
  }

  // Length check
  if (inputs.lengthMm !== undefined) {
    if (isNaN(inputs.lengthMm) || inputs.lengthMm <= 0) {
      errors.push('Shaft length must be greater than 0 mm.');
    } else if (inputs.lengthMm < 10) {
      warnings.push(`Length (${inputs.lengthMm} mm) is unusually short.`);
    }
  }

  // Slenderness / aspect ratio check
  if (inputs.diameterMm && inputs.lengthMm && inputs.diameterMm > 0) {
    const slenderness = inputs.lengthMm / inputs.diameterMm;
    if (slenderness > 50) {
      warnings.push(
        `High slenderness ratio (L/d = ${slenderness.toFixed(1)}). Shaft may be susceptible to lateral critical whirling or excessive flexure.`
      );
    }
  }

  // Torque check
  if (inputs.torqueNm !== undefined) {
    if (isNaN(inputs.torqueNm) || inputs.torqueNm < 0) {
      errors.push('Applied torque must be a non-negative value (≥ 0 N·m).');
    }
  }

  // Force check
  if (inputs.forceN !== undefined) {
    if (isNaN(inputs.forceN) || inputs.forceN < 0) {
      errors.push('Radial force must be a non-negative value (≥ 0 N).');
    }
  }

  // RPM check
  if (inputs.rpm !== undefined) {
    if (isNaN(inputs.rpm) || inputs.rpm < 0) {
      errors.push('Rotational speed must be greater than or equal to 0 RPM.');
    } else if (inputs.rpm > 50000) {
      warnings.push(`Rotational speed (${inputs.rpm} RPM) exceeds typical continuous industrial machinery ratings.`);
    }
  }

  // Safety factor check
  if (inputs.safetyFactor !== undefined) {
    if (isNaN(inputs.safetyFactor) || inputs.safetyFactor <= 0) {
      errors.push('Target safety factor must be strictly greater than 0.');
    } else if (inputs.safetyFactor < 1.0) {
      warnings.push(`Target safety factor (${inputs.safetyFactor}) is below 1.0, indicating design into plastic yield regime.`);
    } else if (inputs.safetyFactor > 10.0) {
      warnings.push(`Safety factor (${inputs.safetyFactor}) is unusually high. Review for over-conservative sizing.`);
    }
  }

  // Material strength check
  if (inputs.yieldStrengthMPa !== undefined) {
    if (isNaN(inputs.yieldStrengthMPa) || inputs.yieldStrengthMPa <= 0) {
      errors.push('Material yield strength must be a positive number.');
    }
  }

  // Elastic modulus check
  if (inputs.elasticModulusGPa !== undefined) {
    if (isNaN(inputs.elasticModulusGPa) || inputs.elasticModulusGPa <= 0) {
      errors.push('Elastic modulus must be a positive number.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
