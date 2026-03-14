import { GoogleGenAI } from "@google/genai";
import { type RulesResult, type RulesInput } from "../rules/engine";

// Initialize the Google Gen AI client. 
// Requires process.env.GEMINI_API_KEY to be set.
const ai = new GoogleGenAI({});

export interface ExtractedClinicalNuances {
    passiveSuicidalIdeation: boolean;
    schoolRefusal: boolean;
    selfHarmBehaviors: boolean;
    rapidWorseningIndicated: boolean;
    justification: string;
}

/**
 * Service to augment the deterministic triage engine using AI.
 * The determinism of the rules engine remains the source of truth;
 * AI is used strictly for extraction, summarization, and flagging.
 */
export const TriageAIService = {

    /**
     * Reads raw unstructured clinical notes or caregiver logs to extract specific,
     * quantifiable risk factors that can be fed into the deterministic engine.
     */
    async extractClinicalNuances(freeTextNotes: string): Promise<ExtractedClinicalNuances | null> {
        if (!freeTextNotes || freeTextNotes.trim() === "") return null;

        try {
            const prompt = `
        You are an expert psychiatric triage assistant reading a caregiver's free-text intake notes.
        Extract the following specific boolean flags:
        1. passiveSuicidalIdeation: Are there statements like "wanting to disappear", "not wake up", or "sleep forever" without an active plan?
        2. schoolRefusal: Is the child actively refusing to attend school or consistently unable to go due to distress?
        3. selfHarmBehaviors: Is there mention of cutting, hitting self, or other non-suicidal self-injury?
        4. rapidWorseningIndicated: Does the caregiver explicitly state that symptoms have worsened sharply in the last 1-2 weeks?

        Respond ONLY in valid JSON matching this schema:
        {
          "passiveSuicidalIdeation": boolean,
          "schoolRefusal": boolean,
          "selfHarmBehaviors": boolean,
          "rapidWorseningIndicated": boolean,
          "justification": "A brief 1-sentence explanation of the findings."
        }

        Notes:
        "${freeTextNotes}"
      `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            const text = response.text;
            if (!text) return null;

            const parsed = JSON.parse(text) as ExtractedClinicalNuances;
            return parsed;

        } catch (error) {
            console.error("AI Extraction failed:", error);
            // Fail gracefully: if AI extraction fails, return null so deterministic engine proceeds normally
            return null;
        }
    },

    /**
     * Generates a plain-language summary of the triage decision for the provider dashboard.
     */
    async generateClinicianSummary(
        rulesInput: RulesInput,
        rulesResult: RulesResult
    ): Promise<string> {
        try {
            const prompt = `
        You are a psychiatric triage handover assistant.
        Draft a concise, 2-3 sentence clinical summary for the receiving provider.

        Patient Age Band: ${rulesResult.ageBand}
        Primary Concern: ${rulesResult.normalizedSymptomFamily}
        Calculated Acuity Score: ${rulesResult.acuityScore}/100
        Deterministic Triage Pathway: ${rulesResult.pathwayKey} (Urgency: ${rulesResult.urgencyLevel})

        Reason Codes Triggered:
        ${rulesResult.reasonCodes.join(", ")}

        Instructions:
        Do not make new diagnoses. Synthesize the above data points into a clear, professional medical handover summary.
      `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            return response.text || "Summary generation returned empty response.";

        } catch (error) {
            console.error("AI Summarization failed:", error);
            return "AI Summarization unavailable at this time.";
        }
    },

    /**
     * Detects logical anomalies between functional scores and symptoms.
     */
    async detectSubClinicalRisks(
        rulesInput: RulesInput,
        rulesResult: RulesResult
    ): Promise<string | null> {
        try {
            // Example: If a patient has severe suicidal risk but the caregiver marked home/school function as "mild" (score 1-2).
            const hasSevereRisk = rulesResult.reasonCodes.some(c => c.includes("SUICIDAL") || c.includes("IMMEDIATE"));
            const isLowFunctionScored = Object.values(rulesInput.functionalImpact || {}).every(val => typeof val === 'number' && val <= 3);

            if (hasSevereRisk && isLowFunctionScored) {
                return "ANOMALY: Caregiver indicated immediate safety risk, but functional impact scores are universally mild. Recommend verifying understanding of functional scales.";
            }

            // We can also ask the AI for more nuanced discrepancy checks here in the future
            return null;
        } catch (e) {
            return null;
        }
    }

};
