"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  Heart, 
  ArrowLeft,
  ExternalLink,
  Shield
} from "lucide-react"

export function SafetyScreen() {
  const { setCurrentScreen, setCurrentStep, intakeData } = useApp()

  const handleBack = () => {
    setCurrentStep(3) // Go back to safety section of intake
    setCurrentScreen('intake')
  }

  const childName = intakeData.childName || "your child"

  return (
    <div className="min-h-screen bg-background">
      {/* Emergency Banner */}
      <div className="bg-destructive text-destructive-foreground py-3 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm md:text-base">
            If there is immediate danger, call 911 now
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Go back</span>
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-2">
                We&apos;re concerned about {childName}&apos;s safety
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Based on your responses, we want to make sure you have access to 
                immediate support. You&apos;re not alone, and help is available right now.
              </p>
            </div>
          </div>
        </header>

        {/* Primary Actions */}
        <div className="grid gap-4 mb-8">
          <Card className="bg-destructive text-destructive-foreground border-0 opacity-0 animate-slide-up stagger-1">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-destructive-foreground/20 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Emergency Services</h2>
                    <p className="opacity-90">
                      If there is immediate danger to life, call 911 right away.
                    </p>
                  </div>
                </div>
                <a 
                  href="tel:911"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-destructive-foreground text-destructive font-semibold hover:opacity-90 transition-opacity shrink-0"
                >
                  <Phone size={20} />
                  Call 911
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary text-secondary-foreground border-0 opacity-0 animate-slide-up stagger-2">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary-foreground/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1">988 Suicide & Crisis Lifeline</h2>
                    <p className="opacity-90">
                      Free, confidential support 24/7. You can call or text.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <a 
                    href="tel:988"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-secondary-foreground text-secondary font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Phone size={18} />
                    Call 988
                  </a>
                  <a 
                    href="sms:988"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-secondary-foreground/20 text-secondary-foreground font-semibold hover:bg-secondary-foreground/30 transition-colors"
                  >
                    <MessageSquare size={18} />
                    Text 988
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supportive Information */}
        <Card className="bg-card border-border mb-6 opacity-0 animate-slide-up stagger-3">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="font-serif text-lg">While You Wait for Help</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {[
                "Stay calm and let your child know you're there for them without judgment.",
                "Remove or secure any items that could be used for self-harm (medications, sharp objects, etc.).",
                "Don't leave your child alone if you're concerned about their immediate safety.",
                "Listen without trying to fix things right away - just being present matters.",
                "Reassure them that feeling this way doesn't mean they're broken, and that help is available.",
              ].map((tip, index) => (
                <li key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card className="bg-card border-border mb-6 opacity-0 animate-slide-up stagger-4">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <a 
                href="https://www.crisistextline.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Crisis Text Line
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Text HOME to 741741 for free, 24/7 crisis support
                  </p>
                </div>
                <ExternalLink size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </a>

              <a 
                href="https://www.thetrevorproject.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    The Trevor Project
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Crisis support for LGBTQ+ young people - Call 1-866-488-7386
                  </p>
                </div>
                <ExternalLink size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </a>

              <a 
                href="https://childmind.org/resources/crisis-resources/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Child Mind Institute
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mental health resources for children, teens, and families
                  </p>
                </div>
                <ExternalLink size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Reassurance */}
        <Card className="bg-primary/5 border-primary/20 opacity-0 animate-fade-in stagger-5">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Heart className="w-6 h-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Reaching out takes courage
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  By seeking help for {childName}, you&apos;re already taking an important step. 
                  Mental health challenges are treatable, and with the right support, things can get better. 
                  You don&apos;t have to navigate this alone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Continue with referral option */}
        <div className="mt-8 text-center opacity-0 animate-fade-in stagger-5">
          <p className="text-sm text-muted-foreground mb-4">
            If the immediate crisis has passed and you&apos;d like ongoing support:
          </p>
          <Button
            variant="outline"
            onClick={() => setCurrentScreen('results')}
            className="gap-2"
          >
            View Referral Recommendations
          </Button>
        </div>
      </div>
    </div>
  )
}
