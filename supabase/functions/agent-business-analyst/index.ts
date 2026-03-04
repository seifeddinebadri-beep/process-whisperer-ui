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

    const [variantsRes, stepsRes, contextRes] = await Promise.all([
      supabase.from("automation_variants").select("*").eq("use_case_id", use_case_id).order("variant_number"),
      supabase.from("process_steps").select("*").eq("process_id", useCase.process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", useCase.process_id).maybeSingle(),
    ]);

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

    const steps = stepsRes.data || [];
    if (steps.length > 0) {
      contextParts.push("\n--- Étapes du processus As-Is ---");
      for (const s of steps) {
        contextParts.push(`${s.step_order}. ${s.name}: ${s.description || ""} (Rôle: ${s.role || "N/A"}, Outil: ${s.tool_used || "N/A"}, Règles: ${s.business_rules || "N/A"})`);
      }
    }

    const ctx = contextRes.data;
    if (ctx) {
      contextParts.push(`\nObjectif: ${ctx.process_objective || "N/A"}`);
      contextParts.push(`Contraintes: ${ctx.known_constraints || "N/A"}`);
      contextParts.push(`Points de douleur: ${ctx.pain_points_summary || "N/A"}`);
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

    // Determine if we should generate PDD or continue conversation
    const shouldGeneratePDD = conversationMessages.length >= 8 && user_message;

    const systemPrompt = `Tu es l'agent Business Analyst, un expert senior en analyse métier et transformation digitale.
Ton rôle est de challenger l'approche d'automatisation proposée pour s'assurer qu'elle est robuste, réaliste et bien pensée.

Tu dois :
1. Questionner les règles métier : sont-elles complètes ? Y a-t-il des cas limites non couverts ?
2. Challenger l'intégration système : quelles sont les dépendances ? Les APIs existent-elles ?
3. Évaluer les risques organisationnels : résistance au changement, formation nécessaire
4. Vérifier la cohérence du périmètre : rien d'oublié ? Rien de superflu ?
5. Questionner les hypothèses de ROI et de coût

Tu poses UNE question à la fois, de manière directe et professionnelle.
Après chaque réponse de l'utilisateur, tu fais un bref accusé de réception puis poses la question suivante.

${shouldGeneratePDD ? "L'utilisateur a répondu à suffisamment de questions. Si sa dernière réponse clôt un sujet, propose de générer le PDD en appelant la fonction generate_pdd_signal. Sinon, pose une dernière question de synthèse." : ""}

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

    const tools: any[] = [];
    if (shouldGeneratePDD) {
      tools.push({
        type: "function",
        function: {
          name: "generate_pdd_signal",
          description: "Signal that enough information has been gathered to generate the PDD",
          parameters: {
            type: "object",
            properties: {
              ready: { type: "boolean" },
              summary: { type: "string", description: "Brief summary of key findings from the conversation" },
            },
            required: ["ready", "summary"],
            additionalProperties: false,
          },
        },
      });
    }

    const aiBody: any = {
      model: "google/gemini-3-flash-preview",
      messages,
    };
    if (tools.length > 0) aiBody.tools = tools;

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
    
    let agentContent = choice?.content || "";
    let pddReady = false;
    let pddSummary = "";

    // Check for tool call (PDD generation signal)
    if (choice?.tool_calls?.[0]) {
      const tc = choice.tool_calls[0];
      if (tc.function.name === "generate_pdd_signal") {
        const args = JSON.parse(tc.function.arguments);
        pddReady = args.ready;
        pddSummary = args.summary;
        if (!agentContent) {
          agentContent = "J'ai recueilli suffisamment d'informations. Je vais maintenant générer le PDD (Process Design Document) basé sur notre échange.";
        }
      }
    }

    // Save agent response
    if (convId && agentContent) {
      await supabase.from("ba_messages").insert({
        conversation_id: convId, role: "agent", content: agentContent,
        metadata: pddReady ? { pdd_ready: true, pdd_summary: pddSummary } : {},
      });
    }

    // Log completion
    await supabase.from("agent_logs").insert({
      process_id: useCase.process_id,
      agent_name: "business_analyst",
      action: "challenge_approach",
      status: "completed",
      message: pddReady
        ? "Challenge session complete. Ready to generate PDD."
        : `Question posed. Conversation has ${(history?.length || 0) + 2} messages.`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: convId,
        agent_message: agentContent,
        pdd_ready: pddReady,
        pdd_summary: pddSummary,
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
