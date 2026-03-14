import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/AlertBanner";
import { Heart, ArrowRight, Info } from "lucide-react";

interface IntakeWelcomeProps {
  onStart: () => void;
}

export function IntakeWelcome({ onStart }: IntakeWelcomeProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="py-10 text-center"
    >
      <motion.div variants={itemVariants} className="flex justify-center mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 shadow-cura-sm ring-1 ring-cyan-300/30">
          <Heart className="h-8 w-8 text-cyan-700" />
        </div>
      </motion.div>

      <motion.h1 variants={itemVariants} className="mb-4 text-4xl font-semibold text-slate-900 md:text-5xl">
        Let's get you the right support
      </motion.h1>

      <motion.p variants={itemVariants} className="mx-auto mb-8 max-w-lg text-lg text-slate-600">
        Answer a few questions so we can guide you to the right care. This usually takes about 5–10 minutes.
      </motion.p>

      <motion.div variants={itemVariants}>
        <Button
          onClick={onStart}
          size="lg"
          className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-base font-semibold shadow-cura-md hover:from-cyan-600 hover:to-blue-700"
        >
          Begin Intake
          <ArrowRight size={18} />
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-10 max-w-lg mx-auto">
        <AlertBanner
          variant="info"
          title=""
          description="This tool helps guide mental health referrals. It does not replace professional medical advice. If someone is in immediate danger, please call 911 or go to the nearest emergency department."
        />
      </motion.div>

      <motion.div variants={itemVariants} className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
        <Info size={14} />
        <span>Your responses are confidential and reviewed only by your care team.</span>
      </motion.div>
    </motion.div>
  );
}
