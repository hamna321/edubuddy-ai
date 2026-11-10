// Feature schema for the XGBoost grade predictor. Mirrors the columns in
// performance_prediction/Student_performance_data.csv (minus StudentID, GPA and
// GradeClass, which are identifiers / targets). The Python ML service expects
// exactly these keys.

export const FEATURES = [
  { key: "Age", label: "Age", type: "number", min: 15, max: 18, step: 1, default: 16 },
  { key: "Gender", label: "Gender", type: "select", default: 0,
    options: [ { v: 0, l: "Male" }, { v: 1, l: "Female" } ] },
  { key: "Ethnicity", label: "Ethnicity", type: "select", default: 0,
    options: [ { v: 0, l: "Caucasian" }, { v: 1, l: "African American" }, { v: 2, l: "Asian" }, { v: 3, l: "Other" } ] },
  { key: "ParentalEducation", label: "Parental education", type: "select", default: 2,
    options: [ { v: 0, l: "None" }, { v: 1, l: "High School" }, { v: 2, l: "Some College" }, { v: 3, l: "Bachelor's" }, { v: 4, l: "Higher study" } ] },
  { key: "StudyTimeWeekly", label: "Weekly study (hours)", type: "number", min: 0, max: 20, step: 0.5, default: 10 },
  { key: "Absences", label: "Absences (per year)", type: "number", min: 0, max: 30, step: 1, default: 5 },
  { key: "Tutoring", label: "Tutoring", type: "select", default: 0,
    options: [ { v: 0, l: "No" }, { v: 1, l: "Yes" } ] },
  { key: "ParentalSupport", label: "Parental support", type: "select", default: 2,
    options: [ { v: 0, l: "None" }, { v: 1, l: "Low" }, { v: 2, l: "Moderate" }, { v: 3, l: "High" }, { v: 4, l: "Very High" } ] },
  { key: "Extracurricular", label: "Extracurricular", type: "select", default: 0,
    options: [ { v: 0, l: "No" }, { v: 1, l: "Yes" } ] },
  { key: "Sports", label: "Sports", type: "select", default: 0,
    options: [ { v: 0, l: "No" }, { v: 1, l: "Yes" } ] },
  { key: "Music", label: "Music", type: "select", default: 0,
    options: [ { v: 0, l: "No" }, { v: 1, l: "Yes" } ] },
  { key: "Volunteering", label: "Volunteering", type: "select", default: 0,
    options: [ { v: 0, l: "No" }, { v: 1, l: "Yes" } ] },
];

export const GRADE_LABELS = { 0: "A", 1: "B", 2: "C", 3: "D", 4: "F" };
export const GRADE_MEANING = {
  0: "Excellent (GPA ≥ 3.5)",
  1: "Good (GPA 3.0–3.5)",
  2: "Average (GPA 2.5–3.0)",
  3: "At risk (GPA 2.0–2.5)",
  4: "Failing (GPA < 2.0)",
};
export const GRADE_TINT = {
  0: "bg-emerald-100 text-emerald-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
};

export function defaultFeatures() {
  const f = {};
  for (const feat of FEATURES) f[feat.key] = feat.default;
  return f;
}

export function coerceFeatures(input) {
  const f = {};
  for (const feat of FEATURES) {
    let v = input?.[feat.key];
    v = Number(v);
    if (Number.isNaN(v)) v = feat.default;
    f[feat.key] = v;
  }
  return f;
}
