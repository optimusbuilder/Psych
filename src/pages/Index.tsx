import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import { Shield, Heart, Stethoscope, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Emergency bar */}
      <div className="bg-risk-high-bg border-b border-urgent/10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs">
          <Phone size={12} className="text-urgent" />
          <span className="text-foreground/80">If someone is in immediate danger, call <a href="tel:911" className="font-semibold text-urgent hover:underline">911</a> or the <a href="tel:988" className="font-semibold text-urgent hover:underline">988 Suicide & Crisis Lifeline</a></span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Project Cura</span>
          </div>
          <Link to="/provider">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Provider Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-4 py-20 md:py-32"
      >
        <div className="max-w-2xl">
          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
              Psychiatric Triage Platform
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-tight">
            Let's get you the right support
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg text-muted-foreground mb-10 max-w-lg">
            Answer a few questions so we can guide you to the right care. Our structured intake helps connect patients and families with the appropriate level of psychiatric support.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
            <Link to="/intake">
              <Button size="lg" className="rounded-xl px-8 gap-2 text-base">
                Begin Intake <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/provider">
              <Button variant="outline" size="lg" className="rounded-xl px-8 text-base">
                Provider Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Feature cards */}
        <motion.div variants={containerVariants} className="grid md:grid-cols-3 gap-4 mt-20">
          {[
            {
              icon: <Heart className="w-6 h-6 text-primary" />,
              title: "Calming Intake Experience",
              desc: "Guided questions designed for parents and caregivers in crisis. Safe, structured, and supportive.",
            },
            {
              icon: <Shield className="w-6 h-6 text-secondary" />,
              title: "Safety-First Triage",
              desc: "Immediate safety screening with automated risk flagging and emergency routing.",
            },
            {
              icon: <Stethoscope className="w-6 h-6 text-primary" />,
              title: "Clinical Decision Support",
              desc: "AI-generated summaries and severity scoring to help clinicians make faster, better decisions.",
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm"
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-medium text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>
    </div>
  );
};

export default Index;
