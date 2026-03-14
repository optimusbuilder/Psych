"use client"

import { useApp } from "@/lib/app-context"
import { downloadFamilyReferralPdf } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UrgencyBadge, UrgencyBadgeWithDescription } from "@/components/urgency-badge"
import { 
  Download, 
  ArrowLeft, 
  CheckCircle, 
  Lightbulb, 
  FileText, 
  User,
  RotateCcw,
  Phone
} from "lucide-react"

export function ResultsScreen() {
  const { recommendation, setCurrentScreen, setCurrentStep } = useApp()

  if (!recommendation) {
    return null
  }

  const handleDownloadPDF = async () => {
    const blob = await downloadFamilyReferralPdf(recommendation.pdfUrl)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cura-referral-${recommendation.referralId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleStartOver = () => {
    setCurrentStep(0)
    setCurrentScreen('start')
  }

  return (
    <div className="min-h-screen bg-background bg-texture">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <button
            onClick={handleStartOver}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Start over</span>
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground">
                Your Referral Recommendation
              </h1>
              <p className="text-muted-foreground">
                Based on the information you provided
              </p>
            </div>
          </div>
        </header>

        {/* Main Recommendation Card */}
        <Card className="bg-card border-border mb-6 overflow-hidden opacity-0 animate-slide-up stagger-1">
          <div className="h-2 bg-primary" />
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommended Specialist</p>
                  <CardTitle className="font-serif text-xl md:text-2xl">
                    {recommendation.specialistType}
                  </CardTitle>
                </div>
              </div>
              <UrgencyBadge level={recommendation.urgencyLevel} size="lg" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-foreground leading-relaxed">
              {recommendation.specialistDescription}
            </p>

            <UrgencyBadgeWithDescription level={recommendation.urgencyLevel} />
          </CardContent>
        </Card>

        {/* Rationale */}
        <Card className="bg-card border-border mb-6 opacity-0 animate-slide-up stagger-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-secondary" />
              </div>
              <CardTitle className="font-serif text-lg">Why This Recommendation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendation.rationale.map((reason, index) => (
                <li key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-foreground leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="bg-card border-border mb-6 opacity-0 animate-slide-up stagger-3">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <CardTitle className="font-serif text-lg">Next Steps</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recommendation.nextSteps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {recommendation.instrumentPack.length > 0 && (
          <Card className="bg-card border-border mb-6 opacity-0 animate-slide-up stagger-3">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="font-serif text-lg">Recommended Screening Pack</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recommendation.instrumentPack.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 opacity-0 animate-slide-up stagger-4">
          <Button
            onClick={handleDownloadPDF}
            className="flex-1 gap-2 bg-primary hover:bg-primary/90 py-6 text-base"
          >
            <Download size={20} />
            Download Referral Summary
          </Button>
          <Button
            variant="outline"
            onClick={handleStartOver}
            className="gap-2 py-6"
          >
            <RotateCcw size={18} />
            Start Over
          </Button>
        </div>

        {/* Crisis Resources */}
        <Card className="bg-muted/50 border-border opacity-0 animate-fade-in stagger-5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Need immediate support?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you or your child are experiencing a mental health crisis, help is available 24/7.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a 
                    href="tel:988"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/90 transition-colors"
                  >
                    <Phone size={16} />
                    Call/Text 988
                  </a>
                  <a 
                    href="tel:911" 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
                  >
                    <Phone size={16} />
                    Call 911
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-8 opacity-0 animate-fade-in stagger-5">
          This tool provides referral guidance only and is not a substitute for professional medical advice, 
          diagnosis, or treatment. Always consult with a qualified healthcare provider.
        </p>
      </div>
    </div>
  )
}
