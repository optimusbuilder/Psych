import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { IntakeStepper } from "@/components/IntakeStepper";
import { IntakeWelcome } from "@/components/intake/IntakeWelcome";
import { IntakeRespondent } from "@/components/intake/IntakeRespondent";
import { IntakeSafetyScreen } from "@/components/intake/IntakeSafetyScreen";
import { IntakePatientInfo } from "@/components/intake/IntakePatientInfo";
import { IntakeSymptoms } from "@/components/intake/IntakeSymptoms";
import { IntakeFunctionalImpact } from "@/components/intake/IntakeFunctionalImpact";
import { IntakeRecommendation } from "@/components/intake/IntakeRecommendation";
import { AlertBanner } from "@/components/AlertBanner";
import { Phone, Shield } from "lucide-react";

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
  patientInfo: { age: string; gender: string; grade: string; concern: string; description: string };
  symptoms: string[];
  functionalImpact: { home: number; school: number; social: number; safety: number };
}

const initialData: IntakeData = {
  respondent: "",
  safetyFlags: { selfHarm: false, suicidal: false, harmOthers: false },
  patientInfo: { age: "", gender: "", grade: "", concern: "", description: "" },
  symptoms: [],
  functionalImpact: { home: 0, school: 0, social: 0, safety: 0 },
};

export default function IntakePage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>(initialData);
  const [safetyBlock, setSafetyBlock] = useState(false);

  const next = () => {
    if (step === 2 && Object.values(data.safetyFlags).some(Boolean)) {
      setSafetyBlock(true);
      return;
    }
    setSafetyBlock(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

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
              onNext={next}
              onBack={prev}
            />
          )}
          {step === 2 && (
            <IntakeSafetyScreen
              key="safety"
              flags={data.safetyFlags}
              onChange={(flags) => setData({ ...data, safetyFlags: flags })}
              onNext={next}
              onBack={prev}
              blocked={safetyBlock}
            />
          )}
          {step === 3 && (
            <IntakePatientInfo
              key="patient"
              info={data.patientInfo}
              onChange={(info) => setData({ ...data, patientInfo: info })}
              onNext={next}
              onBack={prev}
            />
          )}
          {step === 4 && (
            <IntakeSymptoms
              key="symptoms"
              selected={data.symptoms}
              onChange={(s) => setData({ ...data, symptoms: s })}
              onNext={next}
              onBack={prev}
            />
          )}
          {step === 5 && (
            <IntakeFunctionalImpact
              key="impact"
              impact={data.functionalImpact}
              onChange={(impact) => setData({ ...data, functionalImpact: impact })}
              onNext={next}
              onBack={prev}
            />
          )}
          {step === 6 && (
            <IntakeRecommendation key="recommendation" data={data} onBack={prev} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
