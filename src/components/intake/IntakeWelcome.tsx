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
      className="text-center py-12"
    >
      <motion.div variants={itemVariants} className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Heart className="w-8 h-8 text-primary" />
        </div>
      </motion.div>

      <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
        Let's get you the right support
      </motion.h1>

      <motion.p variants={itemVariants} className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
        Answer a few questions so we can guide you to the right care. This usually takes about 5–10 minutes.
      </motion.p>

      <motion.div variants={itemVariants}>
        <Button
          onClick={onStart}
          size="lg"
          className="rounded-xl px-8 py-3 text-base font-medium gap-2"
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

      <motion.div variants={itemVariants} className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Info size={14} />
        <span>Your responses are confidential and reviewed only by your care team.</span>
      </motion.div>
    </motion.div>
  );
}
