"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Heart, Clock, ArrowRight, Lock, Users } from "lucide-react"

export function StartScreen() {
  const { setCurrentScreen } = useApp()

  const features = [
    {
      icon: Shield,
      title: "Private & Confidential",
      description: "Your information stays secure and is never shared without consent.",
    },
    {
      icon: Heart,
      title: "Compassionate Guidance",
      description: "Designed by mental health professionals to support families with care.",
    },
    {
      icon: Clock,
      title: "Quick Assessment",
      description: "Complete the intake in about 10-15 minutes at your own pace.",
    },
  ]

  return (
    <div className="min-h-screen bg-background bg-texture">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
            <Users size={16} />
            <span>For Families</span>
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 text-balance leading-tight">
            Finding the right care
            <br />
            <span className="text-primary">starts here</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            Get personalized guidance on the best mental health specialist for your child. 
            Answer a few questions, and we&apos;ll help point you in the right direction.
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="bg-card border-border opacity-0 animate-slide-up"
              style={{ animationDelay: `${(index + 1) * 0.15}s`, animationFillMode: 'forwards' }}
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mb-12 opacity-0 animate-slide-up stagger-4">
          <Button
            size="lg"
            onClick={() => setCurrentScreen('intake')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Begin Assessment
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm text-muted-foreground opacity-0 animate-fade-in stagger-5">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            <span>256-bit encryption</span>
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <span>HIPAA-aligned practices</span>
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="mt-12 bg-muted/50 border-border opacity-0 animate-fade-in stagger-5">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              <strong className="text-foreground">Important:</strong> This tool provides referral guidance to help 
              connect your family with appropriate mental health professionals. It does not provide diagnosis, 
              treatment recommendations, or emergency care. If you believe your child is in immediate danger, 
              please call 911 or go to your nearest emergency room.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
