# 📅 **THE AGENDA (Calendar) TAB — ULTRA DETAILED SPECIFICATION**

---

# 🔥 **1. Wat de Agenda Tab EXACT is**

De Agenda is een **centrale hub** waar:

### 🔹 **Student ziet:**

* al zijn eigen ingevoerde studie-items
* deadlines van docenten
* klasbrede opdrachten
* persoonlijke AI-planningen
* dagelijkse doelen
* toetsdatums
* reminders
* real-time updates
* progress tracking

### 🔹 **Docent ziet:**

* ingeplande opdrachten
* wie het heeft gedaan
* wie vertraagd is
* inzicht per klas en per student
* toetsmomenten
* huiswerkplanning
* deadlines instellen
* study plan templates toewijzen

Dit is dezelfde Agenda, maar **met rolgebaseerde filters** zodat iedereen ziet wat relevant is.

---

# 🔥 **2. Layout van de Agenda (Frontend functiemap)**

Agenda bestaat uit 3 grote delen:

## **2.1 Bovenbalk**

```
[➤ Month view] | [Week view] | [Day view] | [Timeline view]
[Search bar]
[Add Task +]
[Filters]
```

## **2.2 Kalender**

* grid per maand/week/dag
* items hebben kleurcodes:

  * blauw → student items
  * rood → docent opgelegd item
  * geel → AI gegenereerd study item
  * groen → quiz/toets
  * paars → klas-event

Hover op item → popup met details (docent, klas, omschrijving, AI suggesties).

---

# 🔥 **3. Student Functionaliteit (Alles wat student kan)**

## **3.2 Student ziet taken van docenten**

Deze kun je niet verwijderen.
Opties:

* Markeer als gedaan
* Start oefening (quiz, flashcards, materiaal)
* “Vraag docent uitleg” (stuurt melding)

## **3.3 Student ziet “Klasbreed geplande items”**

Bijvoorbeeld:

* “Klas 2A — Spreekbeurt 6 februari”
* “Klas 2A — Natuurkunde test”

Ze komen automatisch binnen door koppeling met de Classes tab.

## **3.4 Student krijgt AI-notificaties**

Voorbeeld:

* “Je hebt morgen een wiskunde repetitie, wil je nu 15 min oefenen?”
* “Je bent achter op Geschiedenis Hoofdstuk 3”
* “Je hebt 3 onafgemaakte opdrachten, wil je deze inplannen?”

## **3.5 Student kan agenda’s importeren**

* Google Calendar
* Apple Calendar
* Microsoft Outlook
  → We converteren items naar StudyWeb formaat
  → School items worden herkend via AI (“Dit lijkt een toets, wil je dit toevoegen?”)

## **3.6 Student krijgt Study Plan integratie**

Study plan = AI gegenereerde set taken per hoofdstuk, over tijd verspreid.

Student kan:

* alles accepteren
* items verplaatsen
* reminder tijden aanpassen
* volgorde aanpassen

---

# 🔥 **4. Docent Functionaliteit (Alles wat docent kan)**

## **4.3 Docent kan taken kopiëren naar volgende week**

Zo kan een docent een ritme maken:

* Ma: Instructie
* Woe: Oefentoets
* Vr: Inleveren opdracht

Met één klik dupliceren.

## **4.4 Docent kan individuele leerlingen taken geven**

Voor achterstanden:

> “Deze student loopt achter met Frans. Automatisch inplannen?”

AI maakt schema:

* Zaterdag: 20 min vocab
* Zondag: 15 min mini-quiz
* Maandag: herhaling

## **4.5 Docent kan “mass updates” doen**

Bijvoorbeeld:

* Deadline verschuiven
* Opgave aanpassen
* Extra tijd geven
* Taak opnieuw openzetten

Dit pusht updates naar alle studenten.

---

# 🔥 **5. Koppeling tussen Classes tab & Agenda tab**

Dit is het *hart* van het systeem.

## **5.2 Wat gebeurt er als student een taak maakt?**

Niet zichtbaar voor docent (privacy).
Maar docent ziet:

* AI signalen (“Student heeft veel werk de komende dagen”)
  → NIET exacte items.

## **5.3 Quiz plannen → Quiz komt in Agenda**

Wanneer een docent een quiz toewijst:

* student agenda toont exact wanneer quiz beschikbaar is
* student krijgt reminders
* student krijgt AI practice suggestions

## **5.4 Flashcards plannen**

Als docenten flashcards aangeven die geleerd moeten worden:

* AI maakt een plan zodat student niet alles in één dag hoeft te doen

---

# 🔥 **6. Study Plan Engine inside the Agenda**

Deze is extreem belangrijk.

## **6.1 Hoe Study Plans werken**

AI kijkt naar:

* deadlines
* hoeveelheid materiaal
* eerdere prestaties
* vrije tijd in agenda
* hoeveel de student meestal per dag doet
* stress-signalering (te veel taken)

En maakt een schema.

Voorbeeld:

```
Toets in 5 dagen → 90 pagina’s → student leert 20min/dag → AI maakt:

Dag 1: Hoofdstuk 1 samenvatting + mini quiz
Dag 2: Hoofdstuk 2 + flashcards sessie
Dag 3: Hoofdstuk 3 + zwakke punten trainen
Dag 4: Herhaling + moeilijkste vragen
Dag 5: Eindquiz (25 vragen)
```

## **6.2 Study Plan is editable**

Student kan:

* items verschuiven
* items verwijderen
* extra items toevoegen

AI blijft adaptive:

* als student 3 dagen niets doet → schema adjust

---

# 🔥 **7. Agenda Filter System (extreem belangrijk)**

Filters rechtsboven:

* Mijn taken
* Docent taken
* Deadlines
* Toetsen
* Quizzes
* Study Plan items
* Klas events
* Vrije tijd
* Persoonlijke items
* Verberg AI-planning
* Toon alleen vandaag / deze week

---

# 🔥 **8. Agenda notifications (in browser en email)**

### Voor studenten:

* taak bijna deadline
* quiz geopend
* docent heeft iets bijgewerkt
* AI suggestie om nu even te studeren

### Voor docenten:

* 5+ studenten hebben taak niet gedaan
* student is achterstand aan het opbouwen
* quiz resultaten klaar
* vraag gesteld door student

---

# 🔥 **9. Agenda in Dashboard integratie**

Dashboard toont:

* Vandaag’s lijst
* Snelle acties
* Top 3 belangrijkste items
* Achterstand waarschuwingen
* Toetsen komende 7 dagen

---

# 🔥 **10. Agenda & Rechten systeem**

Student:

* kan eigen items toevoegen
* kan docent items zien maar niet wijzigen
* kan AI-plannen aanpassen
* kan deadlines van docent niet verwijderen

Docent:

* kan items voor studenten maken
* kan deadlines instellen/aanpassen
* kan zien wie achterloopt
* kan voortgang van studenten bekijken

Admin:

* kan klassen beheren
* kan agenda’s resetten of archiveren

---

# 🔥 **11. Agenda — Feature brainstorm voor toekomstige updates**

* focus mode (neemt items van agenda en zet ze in Pomodoro-modus)
* location-based study reminders
* AI voorspelt kans dat student iets op tijd af krijgt
* “vrije week planning generator”
* deelbare agenda voor ouders
* examen survival map
* energie-niveau planning (AI plant moeilijkere taken wanneer student meestal actief is)
