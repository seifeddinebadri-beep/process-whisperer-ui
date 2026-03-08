import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { use_case_id, conversation_id, user_message } = await req.json();

    if (!use_case_id) {
      return new Response(JSON.stringify({ error: "use_case_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load use case + variants + process data
    const { data: useCase } = await supabase
      .from("automation_use_cases")
      .select("*, uploaded_processes(file_name)")
      .eq("id", use_case_id)
      .single();

    if (!useCase) {
      return new Response(JSON.stringify({ error: "Use case not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [variantsRes, stepsRes, contextRes, kbToolsRes, clarifierLogsRes] = await Promise.all([
      supabase.from("automation_variants").select("*").eq("use_case_id", use_case_id).order("variant_number"),
      supabase.from("process_steps").select("*").eq("process_id", useCase.process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", useCase.process_id).maybeSingle(),
      supabase.from("tools").select("name, type, purpose").limit(50),
      supabase.from("agent_logs").select("message").eq("process_id", useCase.process_id).in("agent_name", ["clarifier", "business_analyst"]).eq("status", "completed").order("created_at", { ascending: false }).limit(15),
    ]);

    // Fetch step_actions for all steps
    const steps = stepsRes.data || [];
    const stepIds = steps.map((s: any) => s.id);
    let actionsMap: Record<string, any[]> = {};
    if (stepIds.length > 0) {
      const { data: allActions } = await supabase
        .from("step_actions")
        .select("*")
        .in("step_id", stepIds)
        .order("action_order");
      for (const a of (allActions || [])) {
        if (!actionsMap[a.step_id]) actionsMap[a.step_id] = [];
        actionsMap[a.step_id].push(a);
      }
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv } = await supabase.from("ba_conversations").insert({
        use_case_id, process_id: useCase.process_id, status: "in_progress",
      }).select("id").single();
      convId = conv?.id;
    }

    // Save user message if provided
    if (user_message && convId) {
      await supabase.from("ba_messages").insert({
        conversation_id: convId, role: "user", content: user_message,
      });
    }

    // Load conversation history
    const { data: history } = await supabase
      .from("ba_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at");

    // Build context
    const contextParts: string[] = [];
    contextParts.push(`Cas d'usage: ${useCase.title}`);
    contextParts.push(`Description: ${useCase.description}`);
    contextParts.push(`Complexité: ${useCase.complexity}, Impact: ${useCase.impact}, ROI: ${useCase.roi_estimate}`);

    const variants = variantsRes.data || [];
    if (variants.length > 0) {
      contextParts.push("\n--- Variantes d'automatisation ---");
      for (const v of variants) {
        contextParts.push(
          `Variante ${v.variant_number}: ${v.variant_name} (${v.recommended ? "RECOMMANDÉE" : "alternative"})` +
          `\nApproche: ${v.approach_description}` +
          `\nCoût: ${v.estimated_cost}, Délai: ${v.estimated_timeline}` +
          `\nAvantages: ${(v.pros || []).join("; ")}` +
          `\nInconvénients: ${(v.cons || []).join("; ")}`
        );
      }
    }

    if (steps.length > 0) {
      contextParts.push("\n--- Étapes du processus As-Is ---");
      for (const s of steps) {
        contextParts.push(`${s.step_order}. ${s.name}: ${s.description || ""} (Rôle: ${s.role || "N/A"}, Outil: ${s.tool_used || "N/A"}, Règles: ${s.business_rules || "N/A"}${s.screenshot_url ? ", 📸 Screenshot" : ""})`);
        const stepActions = actionsMap[s.id] || [];
        for (const a of stepActions) {
          contextParts.push(`  → Action ${a.action_order}: ${a.description} [Système: ${a.system_used || "N/A"}${a.screenshot_url ? ", 📸 Screenshot" : ""}]`);
        }
      }
    }

    const ctx = contextRes.data;
    if (ctx) {
      contextParts.push(`\nObjectif: ${ctx.process_objective || "N/A"}`);
      contextParts.push(`Contraintes: ${ctx.known_constraints || "N/A"}`);
      contextParts.push(`Points de douleur: ${ctx.pain_points_summary || "N/A"}`);
      if (ctx.stakeholder_notes) contextParts.push(`Notes clarification: ${ctx.stakeholder_notes}`);
    }

    // Add KB tools
    const kbTools = kbToolsRes.data || [];
    if (kbTools.length > 0) {
      contextParts.push("\n--- Outils connus (Base de connaissances) ---");
      for (const t of kbTools) contextParts.push(`- ${t.name} (${t.type || "N/A"}): ${t.purpose || ""}`);
    }

    // Add previous agent findings
    const prevLogs = clarifierLogsRes.data || [];
    if (prevLogs.length > 0) {
      contextParts.push("\n--- Informations déjà collectées ---");
      for (const l of prevLogs) if (l.message) contextParts.push(`- ${l.message}`);
    }

    const isFirstMessage = !user_message;
    const conversationMessages = (history || []).map((m: any) => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    }));

    // Log start
    await supabase.from("agent_logs").insert({
      process_id: useCase.process_id,
      agent_name: "business_analyst",
      action: "challenge_approach",
      status: "started",
      message: isFirstMessage
        ? "Business Analyst agent starting challenge session..."
        : `Processing user response: "${user_message?.slice(0, 80)}..."`,
    });

    const userAnswers = conversationMessages.filter((m: any) => m.role === "user" && !m.content.includes("Question passée") && !m.content.includes("passe cette question")).length;
    const shouldGeneratePDD = userAnswers >= 3 && user_message;
    const MAX_BA_QUESTIONS = 20;
    const totalAsked = Math.floor(conversationMessages.length / 2);

    const systemPrompt = `Tu es l'agent Business Analyst, un expert senior en analyse métier et transformation digitale.
Ton rôle est de challenger l'approche d'automatisation proposée pour s'assurer qu'elle est robuste, réaliste et bien pensée.

Tu as accès aux ACTIONS GRANULAIRES de chaque étape (sous-étapes détaillées avec système utilisé) et aux CAPTURES D'ÉCRAN associées.
Utilise ces informations pour poser des questions plus précises sur les manipulations concrètes et les systèmes impliqués.

BUDGET DE QUESTIONS : max ${MAX_BA_QUESTIONS}, déjà posées ~${totalAsked}. Reste ~${MAX_BA_QUESTIONS - totalAsked}.
${totalAsked >= MAX_BA_QUESTIONS ? "Limite atteinte. Retourne pdd_ready=true avec un message de synthèse." : ""}
Ne pose une question que si elle a une FINALITÉ CLAIRE pour la qualité du PDD final.
NE POSE PAS de question si l'information est déjà dans le contexte ci-dessus.

MÉTHODOLOGIE — Du GÉNÉRAL au SPÉCIFIQUE :
Suis une progression en entonnoir :

PHASE 1 — VALIDATION APPROCHE (questions 1-5) :
Comprends et challenge le choix de l'approche d'automatisation. Pourquoi cette variante ? Quels sont les prérequis ? L'architecture technique est-elle réaliste ?

PHASE 2 — RÈGLES MÉTIER & INTÉGRATIONS (questions 6-12) :
Descends dans les détails : règles métier complètes ? Cas limites couverts ? APIs existantes ? Dépendances systèmes ? Format des données ?

PHASE 3 — RISQUES & CONDUITE DU CHANGEMENT (questions 13-17) :
Explore les risques organisationnels, la résistance au changement, la formation, la montée en charge, la maintenance.

PHASE 4 — ROI & SYNTHÈSE (questions 18-20) :
Challenge les hypothèses de coût, délai, ROI. Questions de synthèse pour finaliser.

Tu es en PHASE ${totalAsked < 5 ? "1 (Validation approche)" : totalAsked < 12 ? "2 (Règles & Intégrations)" : totalAsked < 17 ? "3 (Risques & Changement)" : "4 (ROI & Synthèse)"}.

Tu poses UNE question à la fois via l'appel de fonction fourni, avec un message d'introduction et 3-4 options de réponse pertinentes.
Après chaque réponse, fais un bref accusé de réception puis pose la question suivante.

${shouldGeneratePDD ? "L'utilisateur a répondu à suffisamment de questions. Si sa dernière réponse clôt un sujet, retourne pdd_ready=true." : ""}

RÈGLES ANTI-HALLUCINATION (STRICTES) :
- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le contexte fourni.
- Tes questions de challenge doivent TOUJOURS référencer des éléments spécifiques du cas d'usage (étape, variante, outil, action granulaire, règle métier mentionnée).
- N'invente JAMAIS de scénarios hypothétiques sans rapport avec le contexte fourni.
- Ne fabrique JAMAIS de noms d'outils, de systèmes, d'APIs, ou de technologies qui ne sont pas cités dans le contexte.
- Ne présuppose JAMAIS de chiffres (volumes, coûts, durées) non mentionnés. Si tu fais référence à un chiffre, il doit provenir du contexte.
- Ne crée JAMAIS de règles métier fictives. Cite uniquement celles mentionnées dans le contexte ou la conversation.
- En cas de doute ou d'ambiguïté, signale-le explicitement plutôt que de deviner.
- N'extrapole pas au-delà de ce qui est raisonnablement déductible des données fournies.

Contexte du cas d'usage :
${contextParts.join("\n")}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (isFirstMessage) {
      messages.push({
        role: "user",
        content: "Commence ta session de challenge sur ce cas d'usage. Présente-toi brièvement et pose ta première question.",
      });
    } else {
      messages.push(...conversationMessages);
    }

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "ask_question",
          description: "Ask a structured challenge question with multiple-choice options",
          parameters: {
            type: "object",
            properties: {
              agent_message: { type: "string", description: "Message d'introduction ou accusé de réception avant la question" },
              category: { type: "string", enum: ["business_rules", "integration", "risk", "scope", "roi", "change_management"], description: "Catégorie de la question" },
              question: { type: "string", description: "La question de challenge" },
              why: { type: "string", description: "Pourquoi cette question est importante" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string", description: "Réponse courte" },
                    description: { type: "string", description: "Explication de cette option" },
                  },
                  required: ["label"],
                  additionalProperties: false,
                },
              },
              pdd_ready: { type: "boolean", description: "True si assez d'informations pour générer le PDD" },
            },
            required: ["agent_message", "category", "question", "why", "options", "pdd_ready"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiBody: any = {
      model: "google/gemini-3-flash-preview",
      messages,
      tools,
      tool_choice: { type: "function", function: { name: "ask_question" } },
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI error [${status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0]?.message;
    const toolCall = choice?.tool_calls?.[0];
    
    let result: any = {
      agent_message: "",
      question: null,
      pdd_ready: false,
    };

    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      result = {
        agent_message: args.agent_message,
        question: {
          category: args.category,
          question: args.question,
          why: args.why,
          options: args.options || [],
        },
        pdd_ready: args.pdd_ready || false,
      };
    } else {
      result.agent_message = choice?.content || "Je n'ai pas pu formuler ma question. Pouvez-vous relancer ?";
    }

    // Save agent message
    if (convId && result.agent_message) {
      await supabase.from("ba_messages").insert({
        conversation_id: convId, role: "agent", content: result.agent_message,
        metadata: { question: result.question, pdd_ready: result.pdd_ready },
      });
    }

    // Log completion
    await supabase.from("agent_logs").insert({
      process_id: useCase.process_id,
      agent_name: "business_analyst",
      action: "challenge_approach",
      status: "completed",
      message: result.pdd_ready
        ? "Challenge session complete. Ready to generate PDD."
        : `Question posed (${result.question?.category || "general"}).`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: convId,
        agent_message: result.agent_message,
        question: result.question,
        pdd_ready: result.pdd_ready,
        message_count: (history?.length || 0) + (user_message ? 2 : 1),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("agent-business-analyst error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
