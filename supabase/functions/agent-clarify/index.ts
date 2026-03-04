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

  let process_id: string | undefined;

  try {
    const body = await req.json();
    process_id = body.process_id;
    const conversation_history = body.conversation_history || [];

    if (!process_id) {
      return new Response(JSON.stringify({ error: "process_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log start
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "clarifier", action: "generate_questions", status: "started",
      message: conversation_history.length > 0
        ? `Generating follow-up questions based on ${conversation_history.length} previous answers...`
        : "Analyzing process to generate clarification questions...",
    });

    // Fetch process data
    const [stepsRes, contextRes, chunksRes] = await Promise.all([
      supabase.from("process_steps").select("*").eq("process_id", process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", process_id).maybeSingle(),
      supabase.from("document_chunks").select("content, chunk_index").eq("process_id", process_id).order("chunk_index").limit(10),
    ]);

    // Build context string
    const parts: string[] = [];
    const ctx = contextRes.data;
    if (ctx) {
      parts.push(`Objectif: ${ctx.process_objective || "N/A"}`);
      parts.push(`Contraintes: ${ctx.known_constraints || "N/A"}`);
      parts.push(`Points de douleur: ${ctx.pain_points_summary || "N/A"}`);
      parts.push(`Volume: ${ctx.volume_and_frequency || "N/A"}`);
    }

    const steps = stepsRes.data || [];
    if (steps.length > 0) {
      parts.push("\n--- Étapes ---");
      for (const s of steps) {
        parts.push(`${s.step_order}. ${s.name}: ${s.description || ""} (Outil: ${s.tool_used || "N/A"}, Rôle: ${s.role || "N/A"})`);
      }
    }

    const chunks = chunksRes.data || [];
    if (chunks.length > 0) {
      parts.push("\n--- Extraits ---");
      for (const c of chunks) {
        parts.push(c.content.slice(0, 500));
      }
    }

    const processContext = parts.join("\n");

    // Build conversation context
    let conversationPrompt = "";
    if (conversation_history.length > 0) {
      conversationPrompt = "\n\n--- Réponses précédentes ---\n";
      for (const entry of conversation_history) {
        conversationPrompt += `Q: ${entry.question}\nA: ${entry.answer}\n\n`;
      }
      conversationPrompt += "\nGénère des questions de suivi basées sur ces réponses. Ne répète pas les questions déjà posées.";
    }

    // Build agent intro message
    const isFirstRound = conversation_history.length === 0;
    const introMessage = isFirstRound
      ? "Je suis l'agent Clarifier. J'ai analysé votre processus et j'ai quelques questions pour améliorer l'analyse d'automatisation."
      : `Merci pour vos réponses. Basé sur ce que vous m'avez dit, j'ai quelques questions supplémentaires.`;

    // Call LLM
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu es l'agent Clarifier, expert en analyse de processus métier. " +
              "Ton rôle est de comprendre en détail le processus TEL QU'IL EST AUJOURD'HUI (as-is). " +
              "Tu ne dois JAMAIS poser de questions sur l'automatisation, les outils futurs, ou comment le processus pourrait être amélioré. " +
              "\n\nTes questions doivent couvrir 4 axes, DANS CET ORDRE DE PRIORITÉ :\n" +
              "1. CONTEXTE MÉTIER (commence toujours par là) : Valide ta compréhension du contexte business. " +
              "Reformule ce que tu as compris de l'objectif du processus, du périmètre, et des parties prenantes, puis demande confirmation ou correction. " +
              "2. TRAITEMENT HUMAIN : Comment chaque tâche est concrètement réalisée par les humains au quotidien — " +
              "qui fait quoi, dans quel ordre, avec quels outils existants, quelles sont les étapes manuelles, les copier-coller, les vérifications visuelles. " +
              "3. RÈGLES MÉTIER : Les règles de gestion appliquées aujourd'hui — critères de décision, seuils, conditions, validations, contrôles qualité. " +
              "4. EXCEPTIONS ET CAS PARTICULIERS : Les cas hors norme, les erreurs fréquentes, les contournements, les cas limites rencontrés par les équipes. " +
              "\n" +
              (isFirstRound
                ? "Génère 4-6 questions de clarification. Commence OBLIGATOIREMENT par 1-2 questions de validation du contexte métier (axe 1), " +
                  "puis enchaîne avec les autres axes. "
                : "Génère 2-3 questions de suivi basées sur les réponses précédentes. Adapte l'axe selon ce qui manque encore. ") +
              "Chaque question doit cibler un manque d'information spécifique sur le fonctionnement actuel. " +
              "Pour chaque question, propose 3-4 options de réponse avec des descriptions réalistes. " +
              "Génère aussi un message d'accueil (agent_message) pour le début de la conversation. " +
              "Retourne UNIQUEMENT via l'appel de fonction.\n\n" +
              "RÈGLES ANTI-HALLUCINATION (STRICTES) :\n" +
              "- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le contexte fourni.\n" +
              "- Tes questions doivent cibler des lacunes RÉELLEMENT VISIBLES dans les données fournies. Ne pose pas de questions sur des sujets déjà bien couverts dans le contexte.\n" +
              "- Ne fabrique JAMAIS de noms d'outils, de systèmes ou de technologies dans les options de réponse qui ne sont pas cités dans le contexte.\n" +
              "- Ne présuppose JAMAIS de règles métier, volumes ou fréquences non mentionnés dans le contexte.\n" +
              "- Les options de réponse doivent être génériques et réalistes, pas des affirmations déguisées contenant des données inventées.\n" +
              "- En cas de doute sur une information, formule une question pour la clarifier plutôt que de la deviner.\n" +
              "- N'extrapole pas au-delà de ce qui est raisonnablement déductible des données fournies.",
          },
          {
            role: "user",
            content: `Processus :\n${processContext}${conversationPrompt}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate clarification questions with agent personality",
              parameters: {
                type: "object",
                properties: {
                  agent_message: { type: "string", description: "Message d'introduction de l'agent pour cette série de questions" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        category: { type: "string", enum: ["missing_context", "ambiguity", "volume_detail", "exception_handling", "business_rule", "stakeholder"] },
                        question: { type: "string" },
                        why: { type: "string" },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              label: { type: "string" },
                              description: { type: "string" },
                            },
                            required: ["label"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["id", "category", "question", "why", "options"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["agent_message", "questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "clarifier", action: "generate_questions", status: "error",
        message: `AI error [${status}]`,
      });
      throw new Error(`AI error [${status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let questions: any[];
    let agent_message: string;

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      questions = parsed.questions;
      agent_message = parsed.agent_message;
    } else {
      // Fallback: try to extract from the message content
      const content = aiData.choices?.[0]?.message?.content || "";
      console.warn("No tool call in AI response, attempting to parse content fallback");
      
      // Try to find JSON in the content
      const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.questions || [];
          agent_message = parsed.agent_message || introMessage;
        } catch {
          questions = [];
          agent_message = introMessage;
        }
      } else {
        questions = [];
        agent_message = introMessage;
      }
    }

    // Log completion
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "clarifier", action: "generate_questions", status: "completed",
      message: `Generated ${questions?.length || 0} clarification questions.`,
      metadata: { question_count: questions?.length || 0, round: conversation_history.length > 0 ? "follow_up" : "initial" },
    });

    return new Response(
      JSON.stringify({ success: true, questions, agent_message, intro_message: introMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("agent-clarify error:", e);
    if (process_id) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "clarifier", action: "generate_questions", status: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
