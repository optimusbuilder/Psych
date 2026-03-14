# Detailed Intake Question Bank
Source: `/Users/oluwaferanmioyelude/Downloads/ChildPsych_Triage_Protocol.docx`  
Population: Ages 0-25  
Purpose: Detailed structured question bank for triage intake, aligned to protocol Nodes 1-7.

## Usage Notes
- This file is a question bank, not final UI copy.
- Validated instruments (ASQ, PHQ-A, SCARED, Vanderbilt, etc.) should be assigned and scored through licensed workflows; do not copy instrument items into this intake.
- Any positive safety criteria (Node 1) suspends normal auto-routing and triggers urgent clinician review.
- For ages 0-12, caregiver is primary rater. For ages 13-25, use caregiver + patient reconciliation (18-25 patient primary, caregiver optional).

## Standard Answer Formats
- `YN`: Yes / No / Unsure
- `SelectOne`: single choice
- `SelectMany`: multi-select
- `Frequency`: Never / Rarely / Sometimes / Often / Nearly daily
- `Timeframe`: Right now / Past 24h / Past 7d / Past 30d / >30d ago
- `Severity0to10`: 0 none to 10 extreme
- `Distress0to4`: 0 none, 1 mild, 2 moderate, 3 marked, 4 severe
- `FreeTextShort`: <= 280 chars
- `FreeTextLong`: narrative

---

## Node 0: Intake Context and Respondent Metadata

| ID | Question | Type | Why it matters |
|---|---|---|---|
| CTX-01 | Who is completing this intake today? (patient, parent/caregiver, clinician/referrer, other authorized representative) | SelectOne | Rater logic + reliability weighting |
| CTX-02 | What is your relationship to the patient? | SelectOne | Informant context |
| CTX-03 | Patient legal first and last name | FreeTextShort | Identity |
| CTX-04 | Date of birth | SelectOne (date) | Node 2 age-band |
| CTX-05 | Sex assigned at birth | SelectOne | Demographic context |
| CTX-06 | Current gender identity (optional) | FreeTextShort | Patient-centered care |
| CTX-07 | Preferred language for questionnaires | SelectOne | Instrument delivery |
| CTX-08 | Does the patient currently live with caregiver respondent? | YN | Context for home functioning ratings |
| CTX-09 | Current school/work status | SelectOne | Domain impairment context |
| CTX-10 | Grade / training year / employment status | FreeTextShort | Developmental context |
| CTX-11 | Current referral source (self, PCP, school, ED, therapist, court, other) | SelectOne | Intake operations |
| CTX-12 | Main reason for referral in one sentence | FreeTextShort | Initial triage summary |
| CTX-13 | Top 3 concerns to address first | SelectMany | Symptom family pre-classification |
| CTX-14 | Is this a new concern or worsening of an existing concern? | SelectOne | Trajectory + urgency |

---

## Node 1: Safety Screen (Universal First Gate)

### 1A. Immediate Danger Check

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-01 | Is anyone in immediate danger right now? | YN | Immediate crisis pathway |
| SAF-02 | Is urgent medical attention needed right now (loss of consciousness, seizure, overdose concern)? | YN | Medical triage first |
| SAF-03 | Is the patient currently unsupervised despite active safety risk? | YN | Escalation |
| SAF-04 | Can caregiver/patient maintain safety for the next 24 hours without emergency support? | YN | Crisis threshold |

### 1B. Suicidality / Self-Harm

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-05 | In the past month, has the patient wished they were dead or wished they could go to sleep and not wake up? | YN | ASQ trigger (age >=8) |
| SAF-06 | In the past month, has the patient had thoughts of killing themselves? | YN | ASQ trigger |
| SAF-07 | If yes, has the patient thought about how they might do this? | YN | Severity |
| SAF-08 | If yes, has the patient had intention to act on these thoughts? | YN | Urgency |
| SAF-09 | If yes, has the patient made a specific plan? | YN | Urgency |
| SAF-10 | Has the patient ever attempted suicide? | YN | High-risk history |
| SAF-11 | If yes, was any attempt in the past 3 months? | YN | Immediate escalation |
| SAF-12 | Has there been non-suicidal self-injury in past 30 days (cutting, burning, hitting self)? | YN | Clinician review |
| SAF-13 | Current access to lethal means (medications, firearms, ligatures, high places)? | SelectMany | Safety planning urgency |
| SAF-14 | Protective factors present now (supportive adult, reasons for living, engagement in care)? | SelectMany | Risk context |

### 1C. Homicidal Ideation / Violent Threat

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-15 | Has the patient recently expressed thoughts of seriously harming someone? | YN | Clinician safety assessment |
| SAF-16 | Is there an identified target? | YN | Escalation |
| SAF-17 | Is there a plan or preparation behavior? | YN | Escalation |
| SAF-18 | Access to weapons or objects intended for harm? | YN | Escalation |
| SAF-19 | Any recent threats communicated at school/home/online? | YN | Risk substantiation |
| SAF-20 | Any history of assault causing injury in past 6 months? | YN | Risk severity |

### 1D. Psychosis / Mania-Like Emergency Indicators

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-21 | Hearing voices or seeing things others do not, with distress or behavior change? | YN | Urgent psychiatry pathway |
| SAF-22 | Strong fixed beliefs clearly out of touch with reality? | YN | Urgent psychiatry pathway |
| SAF-23 | Severe confusion/disorganization making supervision difficult? | YN | Urgent pathway |
| SAF-24 | Periods of very high energy with little/no sleep and not tired? | YN | Mania concern |
| SAF-25 | Grandiose or unusually risky behavior outside baseline? | YN | Mania concern |
| SAF-26 | Abrupt behavior change with possible psychosis/mania in past 2 weeks? | YN | Escalation |

### 1E. Severe Aggression / Fire-Setting / Weapon Use

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-27 | Physical aggression toward people in past 30 days? | Frequency | Severity |
| SAF-28 | Physical aggression causing injury in past 30 days? | YN | Crisis threshold |
| SAF-29 | Fire-setting behavior ever / in past 6 months? | SelectOne | Immediate urgent pathway if severe |
| SAF-30 | Weapon carrying or use to intimidate/harm? | YN | Immediate urgent pathway |
| SAF-31 | Serious property destruction episodes in past 30 days? | Frequency | Conduct severity |

### 1F. Severe Intoxication / Withdrawal

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-32 | Current intoxication concern impairing consciousness or judgment? | YN | Medical triage first |
| SAF-33 | Signs of withdrawal (tremor, vomiting, seizures, severe agitation)? | YN | Medical triage first |
| SAF-34 | Recent overdose or blackout event? | YN | Urgent medical/psychiatric review |

### 1G. Abuse / Neglect

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-35 | Has patient disclosed physical abuse, sexual abuse, or neglect? | YN | Mandatory reporting workflow |
| SAF-36 | Unexplained injuries or repeated injury concern? | YN | Mandatory reporting review |
| SAF-37 | Concern for unsafe caregiving environment (supervision/basic needs)? | YN | Reporting + clinician review |
| SAF-38 | Concern for exploitation/trafficking/coercion? | YN | Immediate safeguarding |

### 1H. Safety Disposition Questions

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SAF-39 | Should automated routing be suspended due to safety risk? | YN | Must be true for any positive criteria |
| SAF-40 | Primary safety reason code(s) | SelectMany | Audit + clinician queue |
| SAF-41 | Required action now (ED, urgent psych, mandatory report, medical triage, urgent clinician review) | SelectMany | Operational disposition |
| SAF-42 | Safety notes for receiving clinician | FreeTextLong | Handoff quality |

---

## Node 2: Age Group Classification

| ID | Question | Type | Routing Use |
|---|---|---|---|
| AGE-01 | Confirm patient age in years/months | SelectOne | Age-band engine input |
| AGE-02 | Is patient in Early Childhood (0-5), School Age (6-12), Adolescent (13-17), Transitional/Young Adult (18-25)? | SelectOne | Instrument/rater routing |
| AGE-03 | For ages 13-25, is patient able to complete self-report today? | YN | Rater assignment |
| AGE-04 | For ages 13-25, is caregiver also available to provide collateral ratings? | YN | Reconciliation setup |

---

## Node 3: Communication and Developmental Capacity

| ID | Question | Type | Routing Use |
|---|---|---|---|
| COM-01 | Is the patient verbal enough to describe thoughts/feelings directly? | SelectOne | Self-report eligibility |
| COM-02 | If limited verbal communication, what is primary mode? (gestures/device/ASL/other) | SelectOne | Intake adaptation |
| COM-03 | Any known speech/language delay? | YN | Developmental modifier |
| COM-04 | Any diagnosed developmental delay or intellectual disability? | YN | Caregiver-primary routing |
| COM-05 | Any prior autism diagnosis? | YN | Neurodevelopmental pre-activation |
| COM-06 | Current concern for autism/developmental-social differences? | YN | Node 4 trigger |
| COM-07 | Any major learning disorder concerns impacting current symptoms? | YN | Differential context |
| COM-08 | Any sensory accommodations needed for forms/interview? | SelectMany | Delivery adaptation |
| COM-09 | Can patient tolerate standard-length questionnaires? | SelectOne | Workflow pacing |
| COM-10 | Best informant for behavior at home? | SelectOne | Rater weighting |
| COM-11 | Best informant for school/work functioning? | SelectOne | Teacher/caregiver input planning |
| COM-12 | Communication/development notes | FreeTextLong | Clinician context |

---

## Node 4: Neurodevelopmental / Autism Modifier
Flag when >=2 criteria are present.

| ID | Question | Type | Routing Use |
|---|---|---|---|
| NDEV-01 | Marked sensory sensitivity (sound, textures, light, smell)? | YN | Criterion count |
| NDEV-02 | Sensory-seeking behavior that interferes with daily routines? | YN | Criterion count |
| NDEV-03 | Distress with transitions or changes in routine? | YN | Criterion count |
| NDEV-04 | Strong insistence on sameness/rigidity? | YN | Criterion count |
| NDEV-05 | Repetitive movements/play/self-stimulatory behaviors? | YN | Criterion count |
| NDEV-06 | Narrow/intense interests dominating conversation/time? | YN | Criterion count |
| NDEV-07 | Social reciprocity concerns (back-and-forth conversation/play)? | YN | Criterion count |
| NDEV-08 | Eye contact/nonverbal pragmatics concerns? | YN | Criterion count |
| NDEV-09 | Developmental regression concern at any point? | YN | Urgent developmental referral context |
| NDEV-10 | Is neurodevelopmental/autism parallel pathway indicated? | YN | Node 4 outcome |
| NDEV-11 | If age 16-30 months, queue M-CHAT-R/F? | YN | Instrument routing |
| NDEV-12 | If age 16-35 months, queue SWYC POSI? | YN | Instrument routing |
| NDEV-13 | If >36 months and concerns persist, generate formal autism/developmental referral? | YN | Referral output |

---

## Node 5: Broad Symptom Family Classification
Use preselection + detailed module items. If multiple families are close, defer to Node 6 functional impairment and mixed/unclear logic.

### 5A. Family Preselection

| ID | Question | Type | Routing Use |
|---|---|---|---|
| FAM-01 | Which symptom families are present today? (all that apply, 11-family list) | SelectMany | Candidate families |
| FAM-02 | Which concern started first? | SelectOne | Temporal context |
| FAM-03 | Which concern is currently most impairing? | SelectOne | Primary family candidate |
| FAM-04 | Which concern is most urgent to caregiver/patient? | SelectOne | Priority alignment |
| FAM-05 | Any concern clearly secondary to another (for example anxiety secondary to trauma)? | YN + FreeTextShort | Differential logic |

### 5B. Mood / Depression / Irritability

| ID | Question | Type | Routing Use |
|---|---|---|---|
| MOO-01 | Persistent low mood/sadness most days? | Frequency | Family evidence |
| MOO-02 | Irritability/anger out of proportion to context? | Frequency | Family evidence |
| MOO-03 | Loss of interest/pleasure in usual activities? | Frequency | Family evidence |
| MOO-04 | Fatigue/low energy affecting routine? | Frequency | Severity |
| MOO-05 | Sleep pattern changes (insomnia/hypersomnia)? | SelectOne | Symptom burden |
| MOO-06 | Appetite/weight changes without medical explanation? | SelectOne | Symptom burden |
| MOO-07 | Feelings of guilt/worthlessness/hopelessness? | Frequency | Risk and severity |
| MOO-08 | Concentration decline linked to mood symptoms? | Frequency | Functional impact |

### 5C. Anxiety / Worry / Panic / School Refusal / OCD-like

| ID | Question | Type | Routing Use |
|---|---|---|---|
| ANX-01 | Excessive worry difficult to control? | Frequency | Family evidence |
| ANX-02 | Physical anxiety symptoms (racing heart, trembling, nausea, shortness of breath)? | Frequency | Family evidence |
| ANX-03 | Panic-like episodes with sudden intense fear? | Frequency | Severity |
| ANX-04 | Avoidance due to fear/anxiety? | Frequency | Functional impact |
| ANX-05 | School refusal/work avoidance tied to anxiety? | Frequency | Impairment |
| ANX-06 | Reassurance seeking beyond developmental expectation? | Frequency | Family evidence |
| ANX-07 | Intrusive thoughts causing distress? | Frequency | OCD-like signal |
| ANX-08 | Repetitive rituals/checking/washing/counting to reduce anxiety? | Frequency | OCD-like signal |
| ANX-09 | Social anxiety interfering with peer interactions/presentations? | Frequency | Domain impact |

### 5D. Attention / Hyperactivity / Impulsivity

| ID | Question | Type | Routing Use |
|---|---|---|---|
| ADHD-01 | Difficulty sustaining attention in tasks/conversations? | Frequency | Family evidence |
| ADHD-02 | Easily distracted by unrelated stimuli? | Frequency | Family evidence |
| ADHD-03 | Frequent careless mistakes/losing materials/forgetfulness? | Frequency | Family evidence |
| ADHD-04 | Trouble organizing tasks and deadlines? | Frequency | Impairment |
| ADHD-05 | Fidgeting/restlessness beyond developmental norms? | Frequency | Family evidence |
| ADHD-06 | Leaves seat/runs/climbs in inappropriate situations (child) or inner restlessness (adolescent/adult)? | Frequency | Family evidence |
| ADHD-07 | Interrupting/blurting out/difficulty waiting turn? | Frequency | Impulsivity |
| ADHD-08 | Symptoms observed in more than one setting (home and school/work)? | YN | Cross-setting criterion proxy |

### 5E. Behavioral Dysregulation / Defiance / Aggression

| ID | Question | Type | Routing Use |
|---|---|---|---|
| BD-01 | Frequent temper outbursts disproportionate to trigger? | Frequency | Family evidence |
| BD-02 | Argumentative/defiant behavior toward authority figures? | Frequency | Family evidence |
| BD-03 | Deliberate rule refusal/noncompliance? | Frequency | Family evidence |
| BD-04 | Verbal aggression (insults/threats/yelling) impacting home/school? | Frequency | Severity |
| BD-05 | Physical aggression episodes (without severe conduct markers)? | Frequency | Severity |
| BD-06 | Difficulty returning to baseline after escalation? | Frequency | Regulation burden |
| BD-07 | Triggers are predictable and situational versus pervasive? | SelectOne | Differential |
| BD-08 | Behavioral interventions attempted and response? | FreeTextShort | Treatment planning |

### 5F. Conduct-Type Behaviors

| ID | Question | Type | Routing Use |
|---|---|---|---|
| CD-01 | Repeated lying/deceit for gain? | Frequency | Conduct family evidence |
| CD-02 | Stealing (shoplifting/theft from others)? | Frequency | Conduct severity |
| CD-03 | Cruelty to people or animals? | YN | Severe conduct indicator |
| CD-04 | Fire-setting behavior? | YN | Severe conduct immediate escalation |
| CD-05 | Vandalism/property destruction beyond outburst behavior? | Frequency | Conduct severity |
| CD-06 | Serious rule violations (running away, truancy, legal issues)? | Frequency | Conduct severity |
| CD-07 | Police/court involvement related to behavior? | YN | Escalation + review |
| CD-08 | Any weapon-related incident? | YN | Immediate urgent pathway |

### 5G. Autism / Developmental-Social Concern

| ID | Question | Type | Routing Use |
|---|---|---|---|
| ASD-01 | Social communication differences (pragmatics, reciprocity, conversational flow)? | Frequency | Family evidence |
| ASD-02 | Difficulty interpreting social cues/nonliteral language? | Frequency | Family evidence |
| ASD-03 | Preference for routine and repetitive patterns impacting function? | Frequency | Family evidence |
| ASD-04 | Restricted interests that significantly limit activities? | Frequency | Family evidence |
| ASD-05 | Sensory processing concerns causing distress/avoidance? | Frequency | Family evidence |
| ASD-06 | Developmental milestones concerns (language/social/adaptive)? | YN | Developmental pathway |
| ASD-07 | Prior developmental services (speech/OT/ABA/special education)? | SelectMany | Context |
| ASD-08 | Is formal autism/developmental evaluation already pending? | YN | Referral coordination |

### 5H. Trauma / Stress-Related Symptoms

| ID | Question | Type | Routing Use |
|---|---|---|---|
| TRM-01 | Exposure to traumatic events (abuse, violence, accident, loss, disaster)? | YN | Trauma pathway eligibility |
| TRM-02 | Intrusive memories/nightmares/flashbacks? | Frequency | Trauma family evidence |
| TRM-03 | Avoidance of reminders or places/people linked to trauma? | Frequency | Trauma evidence |
| TRM-04 | Hypervigilance/startle/sleep disturbance related to threat? | Frequency | Trauma evidence |
| TRM-05 | Emotional numbing/detachment since event? | Frequency | Trauma burden |
| TRM-06 | Irritability/anger spikes linked to trauma reminders? | Frequency | Differential |
| TRM-07 | Dissociative episodes (spacing out, unreal feeling, memory gaps)? | Frequency | Severity |
| TRM-08 | Trauma symptoms disrupting school/home/relationships? | Distress0to4 | Domain linkage |
| TRM-09 | Ongoing threat still present? | YN | Immediate safeguarding |

### 5I. Eating / Body Image Concerns

| ID | Question | Type | Routing Use |
|---|---|---|---|
| EAT-01 | Restricting food intake due to weight/shape concerns? | Frequency | Eating pathway evidence |
| EAT-02 | Episodes of overeating with loss of control? | Frequency | Eating pathway evidence |
| EAT-03 | Vomiting/laxative use/compensatory exercise after eating? | Frequency | Severity |
| EAT-04 | Rapid weight change or growth concern? | YN | Medical risk indicator |
| EAT-05 | Intense fear of weight gain or body dissatisfaction? | Frequency | Body image risk |
| EAT-06 | Food avoidance due to sensory aversion/fear (ARFID-like)? | Frequency | ARFID indicator |
| EAT-07 | Nutritional compromise signs (dizziness, fatigue, missed menses, syncope)? | YN | Medical urgency |
| EAT-08 | Significant family conflict around meals? | Frequency | Home impairment |
| EAT-09 | Body-focused preoccupation causing school/social avoidance? | Frequency | Functional impact |

### 5J. Substance Use

| ID | Question | Type | Routing Use |
|---|---|---|---|
| SUB-01 | Any alcohol, cannabis, nicotine/vape, stimulant, opioid, or other substance use in past 12 months? | YN | Substance pathway |
| SUB-02 | Primary substance(s) used | SelectMany | Clinical context |
| SUB-03 | Frequency of use in past 30 days | SelectOne | Severity |
| SUB-04 | Use in unsafe situations (driving, school, with risky peers)? | YN | Risk |
| SUB-05 | Blackouts, overdose, or withdrawal symptoms? | YN | Escalation |
| SUB-06 | Attempts to cut down but unable? | YN | Dependence signal |
| SUB-07 | Family/school/legal problems due to substance use? | SelectMany | Domain impairment |
| SUB-08 | Is same-day substance counseling referral indicated? | YN | Disposition support |

### 5K. Psychosis / Mania-Like Symptoms

| ID | Question | Type | Routing Use |
|---|---|---|---|
| PM-01 | Hallucination-like experiences with distress or functional decline? | Frequency | Family evidence + safety |
| PM-02 | Delusional/paranoid beliefs affecting behavior? | Frequency | Family evidence |
| PM-03 | Disorganized thought/speech impacting communication? | Frequency | Severity |
| PM-04 | Markedly reduced need for sleep with increased energy? | Frequency | Mania indicator |
| PM-05 | Periods of unusually elevated/irritable mood with risky behavior? | Frequency | Mania indicator |
| PM-06 | Abrupt drop in school/work performance linked to above symptoms? | YN | Impairment |
| PM-07 | Family history of bipolar/psychotic disorders (optional) | YN | Risk context |
| PM-08 | Are urgent psychiatry evaluation criteria met now? | YN | Disposition |

### 5L. Mixed / Unclear Clarification

| ID | Question | Type | Routing Use |
|---|---|---|---|
| MIX-01 | Are two or more symptom families equally impairing? | YN | Mixed/unclear flag |
| MIX-02 | Is there insufficient information to identify a primary family? | YN | Mixed/unclear flag |
| MIX-03 | Which two families are most likely primary if forced ranking is needed? | SelectMany | Interim triage |
| MIX-04 | Does case require intake coordinator/clinician review before routing? | YN | Queue hold |
| MIX-05 | Narrative explaining uncertainty | FreeTextLong | Clinical handoff |

---

## Node 6: Severity and Functional Impairment
Highest domain score drives overall severity tier.

### 6A. Home / Family Domain

| ID | Question | Type | Routing Use |
|---|---|---|---|
| IMP-H-01 | Degree symptoms disrupt daily routines at home | Severity0to10 | Domain severity |
| IMP-H-02 | Frequency of family conflict due to symptoms | Frequency | Domain severity |
| IMP-H-03 | Any physical aggression/property damage at home | Frequency | Severe indicator |
| IMP-H-04 | Ability to complete self-care/chores/household expectations | Distress0to4 | Functioning |
| IMP-H-05 | Caregiver burden/supervision needs due to symptoms | Distress0to4 | Context |

### 6B. School / Academic / Work Domain

| ID | Question | Type | Routing Use |
|---|---|---|---|
| IMP-S-01 | Degree symptoms impair attendance/performance | Severity0to10 | Domain severity |
| IMP-S-02 | Recent absences/tardiness due to mental health symptoms | Frequency | Functional impact |
| IMP-S-03 | Academic/work decline in last grading period/month | SelectOne | Trend |
| IMP-S-04 | Disciplinary events (detention/suspension/expulsion/write-ups) | SelectOne | Severe indicator |
| IMP-S-05 | School refusal or inability to remain in class/work setting | Frequency | Severe indicator |

### 6C. Peer / Social Domain

| ID | Question | Type | Routing Use |
|---|---|---|---|
| IMP-P-01 | Degree symptoms impair friendships/social participation | Severity0to10 | Domain severity |
| IMP-P-02 | Social withdrawal/isolation | Frequency | Functional impact |
| IMP-P-03 | Conflict with peers, bullying victimization, or bullying behavior | SelectMany | Risk context |
| IMP-P-04 | Participation in age-appropriate activities | Distress0to4 | Impairment |
| IMP-P-05 | Digital/social-media conflict contributing to symptoms | Frequency | Context |

### 6D. Safety / Legal Domain

| ID | Question | Type | Routing Use |
|---|---|---|---|
| IMP-L-01 | Degree symptoms create safety/legal risk | Severity0to10 | Domain severity |
| IMP-L-02 | Self-harm/suicidal behavior impacting current safety | Frequency | Severe indicator |
| IMP-L-03 | Violence/aggression incidents causing injury or threat | Frequency | Severe indicator |
| IMP-L-04 | Police/court/juvenile justice involvement | SelectOne | Severe indicator |
| IMP-L-05 | Weapon/fire-setting/legal-danger behavior | YN | Severe indicator |

### 6E. Overall Severity and Primary Pathway

| ID | Question | Type | Routing Use |
|---|---|---|---|
| IMP-O-01 | Home score (0-10) | Severity0to10 | Tiering input |
| IMP-O-02 | School/work score (0-10) | Severity0to10 | Tiering input |
| IMP-O-03 | Peer/social score (0-10) | Severity0to10 | Tiering input |
| IMP-O-04 | Safety/legal score (0-10) | Severity0to10 | Tiering input |
| IMP-O-05 | Which domain has the highest impairment? | SelectOne | Primary pathway selector |
| IMP-O-06 | Overall severity tier (mild/moderate/severe/unclear) | SelectOne | Node 6 output |
| IMP-O-07 | Recommended pathway from severity rules | SelectOne | Disposition engine output |

---

## Node 7: Instrument Routing Prep Questions (Not Instrument Items)

### 7A. Broad Screen Eligibility

| ID | Question | Type | Routing Use |
|---|---|---|---|
| INS-01 | Confirm age for broad screen set (0-5, 6-18, toddler months) | SelectOne | PPSC/PSC-17/SDQ/ASQ:SE-2/SWYC |
| INS-02 | Is caregiver available now to complete caregiver-rated forms? | YN | Form assignment |
| INS-03 | Is teacher report feasible within 72 hours (for SDQ/Vanderbilt teacher where applicable)? | YN | Teacher workflow |

### 7B. Anxiety/Mood Routing Prep

| ID | Question | Type | Routing Use |
|---|---|---|---|
| INS-04 | If anxiety family primary, confirm age bracket for PAS vs SCARED vs GAD-7 | SelectOne | Age-appropriate assignment |
| INS-05 | If mood family primary and age 13-17, queue PHQ-A self-report? | YN | Instrument assignment |
| INS-06 | If mood family primary and age 18-25, queue PHQ-9 self-report? | YN | Instrument assignment |
| INS-07 | If suicidality concern and age >=8, queue ASQ now? | YN | Safety override continuity |

### 7C. ADHD/Externalizing/Conduct Routing Prep

| ID | Question | Type | Routing Use |
|---|---|---|---|
| INS-08 | If attention/hyperactivity family primary, queue Vanderbilt parent form? | YN | ADHD screening |
| INS-09 | Is teacher contact available for Vanderbilt teacher form? | YN | Cross-setting evidence |
| INS-10 | If ODD/externalizing signs present, include relevant externalizing subscales? | YN | Externalizing pathway |
| INS-11 | If severe conduct indicators present, hold instrument routing pending clinician safety review? | YN | Protocol safety rule |

### 7D. Autism/Developmental Routing Prep

| ID | Question | Type | Routing Use |
|---|---|---|---|
| INS-12 | If 16-30 months with Node 4 flag, queue M-CHAT-R/F? | YN | Protocol mapping |
| INS-13 | If 16-35 months with Node 4 flag, queue SWYC POSI? | YN | Protocol mapping |
| INS-14 | If >36 months with autism concern, generate formal developmental/autism referral note? | YN | Referral output |

### 7E. Substance/Eating Routing Prep

| ID | Question | Type | Routing Use |
|---|---|---|---|
| INS-15 | If age 12-25 and substance concern, queue CRAFFT? | YN | Substance screening |
| INS-16 | If age 13-25 and eating/body image concern, queue SCOFF? | YN | Eating pathway |
| INS-17 | If ARFID/selective eating concern (age 5-18), flag clinician intake + PARDI-AR-Q workflow? | YN | ARFID pathway support |

### 7F. Completion Logistics

| ID | Question | Type | Routing Use |
|---|---|---|---|
| INS-18 | Preferred questionnaire delivery mode (in-app, email, in-clinic tablet, paper) | SelectOne | Operational workflow |
| INS-19 | Can questionnaires be completed before visit within 24-72h? | YN | Scheduling |
| INS-20 | Any accessibility needs for questionnaire completion? | FreeTextShort | Equity/accessibility |

---

## Multi-Domain Presentation Logic Questions

| ID | Question | Type | Routing Use |
|---|---|---|---|
| MD-01 | If multiple families endorsed, which family contributes most to highest impairment domain? | SelectOne | Primary routing rule |
| MD-02 | Are broad screens required across all endorsed families before narrowing? | YN | Cross-domain signal |
| MD-03 | Is there enough evidence to auto-route or should case go to clinician review queue? | SelectOne | Mixed/unclear safety |
| MD-04 | Clinician/intake coordinator rationale for chosen primary pathway | FreeTextLong | Auditability |

---

## Final Handoff and Disposition Questions

| ID | Question | Type | Routing Use |
|---|---|---|---|
| OUT-01 | Final recommended urgency level (routine/priority/urgent/immediate) | SelectOne | Disposition |
| OUT-02 | Final recommended pathway (urgent psychiatry, specialty clinic, PCP/community, developmental referral, clinician review hold) | SelectOne | Disposition |
| OUT-03 | Required immediate actions today | SelectMany | Operations |
| OUT-04 | Missing critical data fields that block disposition | SelectMany | Quality control |
| OUT-05 | Patient-facing plain-language next steps | FreeTextLong | Family communication |
| OUT-06 | Clinician-facing summary of risk, symptom family, severity, and rationale | FreeTextLong | Clinical handoff |

---

## Minimum Detailed Intake Set (Recommended for MVP Upgrade)
If you need a constrained first release, include at least these sections:
- Node 0 context (`CTX-*`)
- Full Node 1 safety (`SAF-*`)
- Node 3/4 developmental and communication (`COM-*`, `NDEV-*`)
- Family preselection + top 5 families likely seen in pilot (`FAM-*`, `MOO-*`, `ANX-*`, `ADHD-*`, `BD-*`, `TRM-*`)
- Full functional impairment (`IMP-*`)
- Instrument prep and logistics (`INS-*`)
- Final output/handoff (`OUT-*`)

This yields a much richer intake than a 4-question flow while staying aligned with protocol logic and provider review requirements.
