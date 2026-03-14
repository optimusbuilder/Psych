import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PatientInfo {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  grade: string;
  verbalCommunication: string;
  developmentalDelayConcern: string;
  autismConcern: string;
  learningConcern: string;
  concern: string;
  description: string;
}

interface IntakePatientInfoProps {
  info: PatientInfo;
  onChange: (info: PatientInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

const concerns = [
  "Anxiety / Panic",
  "Depression / Mood",
  "ADHD / Attention",
  "Behavioral Issues",
  "Social or Developmental Concerns",
  "Substance Use",
  "Trauma / PTSD",
  "Other",
];

export function IntakePatientInfo({ info, onChange, onNext, onBack }: IntakePatientInfoProps) {
  const update = (key: keyof PatientInfo, value: string) => onChange({ ...info, [key]: value });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
    >
      <motion.h2 variants={itemVariants} className="mb-2 text-3xl font-semibold text-slate-900">
        Patient Information
      </motion.h2>
      <motion.p variants={itemVariants} className="mb-8 text-slate-600">
        Tell us a bit about the person who needs care.
      </motion.p>

      <div className="mx-auto max-w-2xl space-y-5">
        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-700">First Name</Label>
            <Input
              placeholder="e.g. Ava"
              value={info.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="h-11 rounded-xl border-slate-200/90 bg-white/85"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Last Name</Label>
            <Input
              placeholder="e.g. Chen"
              value={info.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="h-11 rounded-xl border-slate-200/90 bg-white/85"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-700">Age</Label>
            <Input
              type="number"
              placeholder="e.g. 14"
              value={info.age}
              onChange={(e) => update("age", e.target.value)}
              className="h-11 rounded-xl border-slate-200/90 bg-white/85"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Gender (optional)</Label>
            <Select value={info.gender} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200/90 bg-white/85">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="nonbinary">Non-binary</SelectItem>
                <SelectItem value="prefer-not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="text-slate-700">School Grade (optional)</Label>
          <Input
            placeholder="e.g. 8th grade"
            value={info.grade}
            onChange={(e) => update("grade", e.target.value)}
            className="h-11 rounded-xl border-slate-200/90 bg-white/85"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Communication & Development</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-700">Communication profile</Label>
              <Select value={info.verbalCommunication} onValueChange={(v) => update("verbalCommunication", v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200/90 bg-white/85">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verbal_typical">Verbal, age-typical</SelectItem>
                  <SelectItem value="limited_verbal">Limited verbal</SelectItem>
                  <SelectItem value="nonverbal">Nonverbal/assisted communication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Known developmental delay / ID?</Label>
              <Select
                value={info.developmentalDelayConcern}
                onValueChange={(v) => update("developmentalDelayConcern", v)}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200/90 bg-white/85">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unsure">Unsure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Autism diagnosis or current concern?</Label>
              <Select value={info.autismConcern} onValueChange={(v) => update("autismConcern", v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200/90 bg-white/85">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unsure">Unsure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Major learning concern impacting function?</Label>
              <Select value={info.learningConcern} onValueChange={(v) => update("learningConcern", v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200/90 bg-white/85">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unsure">Unsure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="text-slate-700">Primary Concern</Label>
          <Select value={info.concern} onValueChange={(v) => update("concern", v)}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200/90 bg-white/85">
              <SelectValue placeholder="What brings you here today?" />
            </SelectTrigger>
            <SelectContent>
              {concerns.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="text-slate-700">Tell us more (optional)</Label>
          <Textarea
            placeholder="Describe what's been going on..."
            value={info.description}
            onChange={(e) => update("description", e.target.value)}
            className="min-h-[110px] rounded-xl border-slate-200/90 bg-white/85"
          />
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-full text-slate-700 hover:bg-white/50">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!info.firstName || !info.lastName || !info.age}
          className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 shadow-cura-md hover:from-cyan-600 hover:to-blue-700"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
