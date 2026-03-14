import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motionVariants";
import { mockCases } from "@/data/mockData";
import { RiskBadge } from "@/components/RiskBadge";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProviderCases() {
  const navigate = useNavigate();
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
      <motion.h1 variants={itemVariants} className="text-2xl font-semibold text-foreground mb-1">
        Intake Cases
      </motion.h1>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-6">
        All submitted intake cases and their current status.
      </motion.p>

      <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border shadow-cura-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Patient</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="hidden md:table-cell">Primary Concern</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Reviewer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCases.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/provider/cases/${c.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {c.patientName.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-medium text-foreground">{c.patientName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{c.age}</TableCell>
                  <TableCell><RiskBadge level={c.riskLevel} /></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.primaryConcern}</TableCell>
                  <TableCell className="tabular-nums font-medium">{c.severityScore}%</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="capitalize text-sm text-muted-foreground">{c.status}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {c.reviewer || "—"}
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </motion.div>
  );
}
