import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PatientInfo {
  age: string;
  gender: string;
  grade: string;
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
      <motion.h2 variants={itemVariants} className="text-2xl font-semibold text-foreground mb-2">
        Patient Information
      </motion.h2>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
        Tell us a bit about the person who needs care.
      </motion.p>

      <div className="space-y-5">
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Age</Label>
            <Input
              type="number"
              placeholder="e.g. 14"
              value={info.age}
              onChange={(e) => update("age", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Gender (optional)</Label>
            <Select value={info.gender} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger className="rounded-xl">
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
          <Label>School Grade (optional)</Label>
          <Input
            placeholder="e.g. 8th grade"
            value={info.grade}
            onChange={(e) => update("grade", e.target.value)}
            className="rounded-xl"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label>Primary Concern</Label>
          <Select value={info.concern} onValueChange={(v) => update("concern", v)}>
            <SelectTrigger className="rounded-xl">
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
          <Label>Tell us more (optional)</Label>
          <Textarea
            placeholder="Describe what's been going on..."
            value={info.description}
            onChange={(e) => update("description", e.target.value)}
            className="rounded-xl min-h-[100px]"
          />
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button onClick={onNext} disabled={!info.age || !info.concern} className="gap-2 rounded-xl">
          Continue <ArrowRight size={16} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
