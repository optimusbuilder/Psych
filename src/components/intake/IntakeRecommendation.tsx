import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, FileText, Stethoscope } from "lucide-react";
import type { IntakeData } from "@/pages/IntakePage";
import { useNavigate } from "react-router-dom";

interface IntakeRecommendationProps {
  data: IntakeData;
  onBack: () => void;
}

function getRecommendation(data: IntakeData) {
  const maxImpact = Math.max(...Object.values(data.functionalImpact));
  const hasSafety = Object.values(data.safetyFlags).some(Boolean);

  if (hasSafety) {
    return {
      level: "urgent" as const,
      title: "Urgent Psychiatric Evaluation Recommended",
      description: "Based on the safety screening responses, we recommend an urgent psychiatric evaluation. A clinician will review this intake within the hour.",
      color: "border-urgent bg-risk-high-bg",
    };
  }
  if (maxImpact >= 7) {
    return {
      level: "high" as const,
      title: "Mental Health Intake Appointment Suggested",
      description: "The level of functional impairment suggests a comprehensive mental health evaluation would be beneficial.",
      color: "border-risk-moderate bg-risk-moderate-bg",
    };
  }
  return {
    level: "standard" as const,
    title: "Follow Up With Pediatrician",
    description: "Based on your responses, we recommend discussing these concerns with your pediatrician, who may refer you to a specialist.",
    color: "border-secondary bg-secondary/10",
  };
}

export function IntakeRecommendation({ data, onBack }: IntakeRecommendationProps) {
  const rec = getRecommendation(data);
  const navigate = useNavigate();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20 }}
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3 mb-2">
        <CheckCircle2 className="w-6 h-6 text-secondary" />
        <h2 className="text-2xl font-semibold text-foreground">We've received your information</h2>
      </motion.div>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
        Here's what we recommend based on your responses.
      </motion.p>

      <motion.div
        variants={itemVariants}
        className={`border-l-4 ${rec.color} p-6 rounded-r-2xl mb-6`}
      >
        <h3 className="font-semibold text-foreground mb-2">{rec.title}</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">{rec.description}</p>
      </motion.div>

      <motion.h3 variants={itemVariants} className="text-lg font-medium text-foreground mb-4">
        What happens next
      </motion.h3>

      <div className="space-y-3">
        {[
          { icon: <FileText size={18} />, text: "Your responses have been securely submitted to the care team." },
          { icon: <Stethoscope size={18} />, text: "A clinician is reviewing your information now." },
          { icon: <Clock size={18} />, text: "You'll be contacted within 24–48 hours with next steps." },
        ].map((item, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-cura-sm"
          >
            <div className="text-primary mt-0.5">{item.icon}</div>
            <p className="text-sm text-foreground">{item.text}</p>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button onClick={() => navigate("/")} className="gap-2 rounded-xl">
          Share with Care Team
        </Button>
      </motion.div>
    </motion.div>
  );
}
