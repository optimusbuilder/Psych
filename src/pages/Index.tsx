import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import { Shield, Heart, Stethoscope, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(1100px 540px at 10% -8%, rgba(56,189,248,0.28), transparent 58%), radial-gradient(800px 460px at 94% 10%, rgba(45,212,191,0.22), transparent 60%), linear-gradient(165deg, #0A1224 0%, #142C54 42%, #1E4778 100%)",
        }}
      />

      <div className="relative z-10 border-b border-white/10 bg-rose-50/90">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-2 text-xs">
          <Phone size={12} className="text-rose-600" />
          <span className="text-slate-700">
            If someone is in immediate danger, call{" "}
            <a href="tel:911" className="font-semibold text-rose-700 hover:underline">911</a> or the{" "}
            <a href="tel:988" className="font-semibold text-rose-700 hover:underline">988 Suicide & Crisis Lifeline</a>
          </span>
        </div>
      </div>

      <header className="relative z-10">
        <div className="mx-auto mt-4 flex max-w-5xl items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white">
            <Shield className="h-6 w-6 text-cyan-200" />
            <span className="text-lg font-semibold">Project Cura</span>
          </div>
          <Link to="/provider">
            <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/20 hover:text-white">
              Provider Login
            </Button>
          </Link>
        </div>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-24"
      >
        <div className="glass-panel rounded-[2rem] border-white/25 px-6 py-10 md:px-12 md:py-14">
        <div className="max-w-2xl">
          <motion.div variants={itemVariants} className="mb-6 flex items-center gap-2">
            <span className="rounded-full bg-cyan-100/90 px-3 py-1 text-xs font-semibold text-cyan-700">
              Psychiatric Triage Platform
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="mb-6 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Let's get you the right support
          </motion.h1>

          <motion.p variants={itemVariants} className="mb-10 max-w-lg text-lg text-slate-700">
            Answer a few questions so we can guide you to the right care. Our structured intake helps connect patients and families with the appropriate level of psychiatric support.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
            <Link to="/intake">
              <Button size="lg" className="gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 text-base shadow-cura-md hover:from-cyan-600 hover:to-blue-700">
                Begin Intake <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/provider">
              <Button variant="outline" size="lg" className="rounded-full border-slate-300 bg-white/85 px-8 text-base text-slate-800 hover:bg-white">
                Provider Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div variants={containerVariants} className="mt-16 grid gap-4 md:grid-cols-3">
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
              className="rounded-2xl border border-white/45 bg-white/80 p-6 shadow-cura-sm backdrop-blur-sm"
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="mb-2 font-medium text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        </div>
      </motion.main>
    </div>
  );
};

export default Index;
