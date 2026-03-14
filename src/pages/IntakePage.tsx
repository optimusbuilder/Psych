import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { IntakeStepper } from "@/components/IntakeStepper";
import { IntakeWelcome } from "@/components/intake/IntakeWelcome";
import { IntakeRespondent } from "@/components/intake/IntakeRespondent";
import { IntakeSafetyScreen } from "@/components/intake/IntakeSafetyScreen";
import { IntakePatientInfo } from "@/components/intake/IntakePatientInfo";
import { IntakeSymptoms } from "@/components/intake/IntakeSymptoms";
import { IntakeFunctionalImpact } from "@/components/intake/IntakeFunctionalImpact";
import { IntakeRecommendation } from "@/components/intake/IntakeRecommendation";
import { Phone, Shield } from "lucide-react";
import {
  ApiError,
  createIntakeSession,
  saveFunctionalImpact,
  saveRespondent,
  saveSafety,
  saveSymptoms,
  submitIntakeSession,
  type IntakeSubmitResponse,
} from "@/lib/api";

const STEPS = [
  "Welcome",
  "About You",
  "Safety Screening",
  "Patient Information",
  "Symptoms",
  "Functional Impact",
  "Recommendation",
];

export interface IntakeData {
  respondent: string;
  safetyFlags: { selfHarm: boolean; suicidal: boolean; harmOthers: boolean };
  patientInfo: {
    firstName: string;
    lastName: string;
    age: string;
    gender: string;
    grade: string;
    concern: string;
    description: string;
  };
  symptoms: string[];
  functionalImpact: { home: number; school: number; social: number; safety: number };
}

const initialData: IntakeData = {
  respondent: "",
  safetyFlags: { selfHarm: false, suicidal: false, harmOthers: false },
  patientInfo: {
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    grade: "",
    concern: "",
    description: "",
  },
  symptoms: [],
  functionalImpact: { home: 0, school: 0, social: 0, safety: 0 },
};

const symptomMap: Record<string, string> = {
  anxiety: "Anxiety / Worry / Panic / School Refusal / OCD-like",
  depression: "Mood / Depression / Irritability",
  adhd: "ADHD / Attention / Hyperactivity / Impulsivity",
  behavioral: "Behavioral Dysregulation / Defiance / Aggression",
  social: "Autism / Developmental / Social Communication",
  substance: "Substance Use",
};

function ageToDob(ageText: string) {
  const age = Number.parseInt(ageText, 10);
  if (!Number.isFinite(age) || age < 0) {
    return "2010-01-01";
  }
  const now = new Date();
  return `${now.getUTCFullYear() - age}-01-01`;
}

function respondentToApiType(value: string): "patient" | "caregiver" | "clinician" {
  if (value === "self") {
    return "patient";
  }
  if (value === "other") {
    return "clinician";
  }
  return "caregiver";
}

export default function IntakePage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>(initialData);
  const [safetyBlock, setSafetyBlock] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<IntakeSubmitResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const next = () => {
    if (step === 2 && Object.values(data.safetyFlags).some(Boolean) && !safetyBlock) {
      setSafetyBlock(true);
      return;
    }
    setSafetyBlock(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const hasSafetyFlags = useMemo(() => Object.values(data.safetyFlags).some(Boolean), [data.safetyFlags]);

  function mapApiError(error: unknown) {
    if (error instanceof ApiError) {
      const body = error.body as Record<string, unknown> | null;
      if (body?.message && typeof body.message === "string") {
        return body.message;
      }
      if (body?.error && typeof body.error === "string") {
        return body.error;
      }
      return `Request failed (${error.status}).`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Unexpected error. Please try again.";
  }

  async function handlePatientInfoNext() {
    setErrorMessage(null);
    setSaving(true);
    try {
      const createdSession =
        sessionId ??
        (
          await createIntakeSession({
            patient: {
              firstName: data.patientInfo.firstName.trim(),
              lastName: data.patientInfo.lastName.trim(),
              dob: ageToDob(data.patientInfo.age),
              sexAtBirth:
                data.patientInfo.gender === "female" || data.patientInfo.gender === "male"
                  ? data.patientInfo.gender
                  : "unknown",
            },
          })
        ).id;

      if (!sessionId) {
        setSessionId(createdSession);
      }

      await saveRespondent(createdSession, respondentToApiType(data.respondent));
      const safetyResponse = await saveSafety(createdSession, data.safetyFlags);

      if (safetyResponse.requiresImmediateReview || hasSafetyFlags) {
        const submitResponse = await submitIntakeSession(createdSession);
        setSubmission(submitResponse);
        setSafetyBlock(true);
        setStep(6);
        return;
      }

      setStep(4);
    } catch (error) {
      setErrorMessage(mapApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSymptomsNext() {
    if (!sessionId) {
      setErrorMessage("Session was not initialized. Please go back and try again.");
      return;
    }
    setErrorMessage(null);
    setSaving(true);
    try {
      const primary = symptomMap[data.symptoms[0]] ?? data.patientInfo.concern;
      const secondary = data.symptoms.slice(1).map((id) => symptomMap[id]).filter(Boolean);
      await saveSymptoms(sessionId, primary, secondary);
      setStep(5);
    } catch (error) {
      setErrorMessage(mapApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleFunctionalNext() {
    if (!sessionId) {
      setErrorMessage("Session was not initialized. Please go back and try again.");
      return;
    }
    setErrorMessage(null);
    setSaving(true);
    try {
      await saveFunctionalImpact(sessionId, data.functionalImpact);
      const submitResponse = await submitIntakeSession(sessionId);
      setSubmission(submitResponse);
      setStep(6);
    } catch (error) {
      setErrorMessage(mapApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Emergency header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Project Cura</span>
          </div>
          <a
            href="tel:911"
            className="flex items-center gap-1.5 text-xs font-medium text-urgent hover:underline"
          >
            <Phone size={14} />
            Emergency: Call 911
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-urgent/30 bg-risk-high-bg px-4 py-3 text-sm text-foreground">
            {errorMessage}
          </div>
        )}

        {step > 0 && (
          <div className="mb-8">
            <IntakeStepper steps={STEPS} currentStep={step} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 0 && <IntakeWelcome key="welcome" onStart={() => setStep(1)} />}
          {step === 1 && (
            <IntakeRespondent
              key="respondent"
              value={data.respondent}
              onChange={(v) => setData({ ...data, respondent: v })}
              onNext={saving ? () => undefined : next}
              onBack={prev}
            />
          )}
          {step === 2 && (
            <IntakeSafetyScreen
              key="safety"
              flags={data.safetyFlags}
              onChange={(flags) => setData({ ...data, safetyFlags: flags })}
              onNext={saving ? () => undefined : next}
              onBack={prev}
              blocked={safetyBlock}
            />
          )}
          {step === 3 && (
            <IntakePatientInfo
              key="patient"
              info={data.patientInfo}
              onChange={(info) => setData({ ...data, patientInfo: info })}
              onNext={saving ? () => undefined : handlePatientInfoNext}
              onBack={prev}
            />
          )}
          {step === 4 && (
            <IntakeSymptoms
              key="symptoms"
              selected={data.symptoms}
              onChange={(s) => setData({ ...data, symptoms: s })}
              onNext={saving ? () => undefined : handleSymptomsNext}
              onBack={prev}
            />
          )}
          {step === 5 && (
            <IntakeFunctionalImpact
              key="impact"
              impact={data.functionalImpact}
              onChange={(impact) => setData({ ...data, functionalImpact: impact })}
              onNext={saving ? () => undefined : handleFunctionalNext}
              onBack={prev}
            />
          )}
          {step === 6 && (
            <IntakeRecommendation
              key="recommendation"
              data={data}
              submission={submission}
              sessionId={sessionId}
              onBack={prev}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
