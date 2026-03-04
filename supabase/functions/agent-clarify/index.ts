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

    const totalQuestionsAsked = body.total_questions_asked || 0;
    const MAX_QUESTIONS = 20; // Hard cap across all rounds

    // If we've already asked enough, stop
    if (totalQuestionsAsked >= MAX_QUESTIONS) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "clarifier", action: "generate_questions", status: "completed",
        message: "Session complete — question limit reached.",
      });
      return new Response(
        JSON.stringify({ success: true, questions: [], agent_message: "J'ai suffisamment d'informations pour enrichir le contexte. Merci pour vos réponses !", session_complete: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch process data + KB context in parallel
    const [stepsRes, contextRes, chunksRes, kbToolsRes, kbActivitiesRes, agentLogsRes] = await Promise.all([
      supabase.from("process_steps").select("*").eq("process_id", process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", process_id).maybeSingle(),
      supabase.from("document_chunks").select("content, chunk_index").eq("process_id", process_id).order("chunk_index").limit(10),
      supabase.from("tools").select("name, type, purpose").limit(50),
      supabase.from("activities").select("name, business_objective, description").limit(50),
      supabase.from("agent_logs").select("message, metadata").eq("process_id", process_id).eq("agent_name", "clarifier").eq("status", "completed").order("created_at", { ascending: false }).limit(10),
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

    // Add KB context
    const kbTools = kbToolsRes.data || [];
    if (kbTools.length > 0) {
      parts.push("\n--- Outils connus (Base de connaissances) ---");
      for (const t of kbTools) {
        parts.push(`- ${t.name} (${t.type || "N/A"}): ${t.purpose || ""}`);
      }
    }

    const kbActivities = kbActivitiesRes.data || [];
    if (kbActivities.length > 0) {
      parts.push("\n--- Activités connues (Base de connaissances) ---");
      for (const a of kbActivities) {
        parts.push(`- ${a.name}: ${a.business_objective || a.description || ""}`);
      }
    }

    // Add previous agent logs to avoid redundancy
    const previousLogs = agentLogsRes.data || [];
    if (previousLogs.length > 0) {
      parts.push("\n--- Informations déjà collectées (logs) ---");
      for (const log of previousLogs) {
        if (log.message) parts.push(`- ${log.message}`);
      }
    }

    const processContext = parts.join("\n");

    const remainingBudget = MAX_QUESTIONS - totalQuestionsAsked;

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
              "\n\nIMPORTANT — BUDGET DE QUESTIONS :\n" +
              `Tu disposes d'un budget de ${remainingBudget} questions restantes (max ${MAX_QUESTIONS} au total, ${totalQuestionsAsked} déjà posées). ` +
              "Ne pose une question que si elle a une FINALITÉ CLAIRE et ACTIONNABLE pour l'analyse. " +
              "NE POSE PAS de question si l'information est déjà disponible dans le contexte, la base de connaissances, ou les logs ci-dessus. " +
              "Si tu estimes avoir suffisamment d'informations, retourne session_complete=true et un message de clôture. " +
              "Privilégie la QUALITÉ à la QUANTITÉ : mieux vaut 2 questions percutantes que 6 questions vagues.\n\n" +
              "MÉTHODOLOGIE — Du GÉNÉRAL au SPÉCIFIQUE :\n" +
              "Tu dois suivre une progression structurée en entonnoir. Commence large, puis affine.\n\n" +
              "PHASE 1 — CONTEXTE GÉNÉRAL (questions 1-4) :\n" +
              "Valide ta compréhension globale du processus. Reformule l'objectif, le périmètre, les parties prenantes principales. " +
              "Demande confirmation ou correction. Comprends POURQUOI ce processus existe et QUI il sert.\n\n" +
              "PHASE 2 — FRÉQUENCE ET VOLUMÉTRIE (questions 5-8) :\n" +
              "Quantifie le processus : combien de fois par jour/semaine/mois cette tâche est-elle exécutée ? " +
              "Combien de dossiers/transactions/cas sont traités ? Combien de temps prend chaque exécution en moyenne ? " +
              "Y a-t-il des pics saisonniers ou des périodes de forte charge ? " +
              "Combien de personnes sont mobilisées ? Quel est le temps total consacré par l'équipe ?\n\n" +
              "PHASE 3 — TRAITEMENT HUMAIN (questions 9-13) :\n" +
              "Descends dans le détail opérationnel. Comment chaque tâche est concrètement réalisée au quotidien : " +
              "qui fait quoi, dans quel ordre, avec quels outils existants, quelles manipulations manuelles (copier-coller, saisie, vérification visuelle), " +
              "quels sont les goulots d'étranglement.\n\n" +
              "PHASE 4 — RÈGLES MÉTIER (questions 14-17) :\n" +
              "Identifie les règles de gestion : critères de décision, seuils, conditions, validations, contrôles qualité. " +
              "Quand une décision est prise, sur quels critères ? Y a-t-il des matrices de décision, des barèmes, des tables de référence ?\n\n" +
              "PHASE 5 — EXCEPTIONS ET CAS LIMITES (questions 18-20) :\n" +
              "Explore les cas hors norme : erreurs fréquentes, contournements, cas limites, situations d'urgence, " +
              "que se passe-t-il quand une donnée manque ou est incorrecte, quels sont les scénarios de fallback.\n\n" +
              `Tu es actuellement en PHASE ${totalQuestionsAsked < 4 ? "1 (Contexte général)" : totalQuestionsAsked < 8 ? "2 (Fréquence et volumétrie)" : totalQuestionsAsked < 13 ? "3 (Traitement humain)" : totalQuestionsAsked < 17 ? "4 (Règles métier)" : "5 (Exceptions)"}.\n\n` +
              (isFirstRound
                ? `Génère exactement ${Math.min(remainingBudget, 5)} questions pour cette phase. `
                : `Génère exactement ${Math.min(remainingBudget, 5)} questions de suivi pour la phase courante. Si la phase est couverte, passe à la suivante. Si tout est couvert, retourne session_complete=true. `) +
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
                  session_complete: { type: "boolean", description: "True si l'agent estime avoir suffisamment d'informations et n'a plus de questions pertinentes" },
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
                required: ["agent_message", "session_complete", "questions"],
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
    let session_complete = false;

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      questions = parsed.questions || [];
      agent_message = parsed.agent_message;
      session_complete = parsed.session_complete || false;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      console.warn("No tool call in AI response, attempting to parse content fallback");
      const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.questions || [];
          agent_message = parsed.agent_message || introMessage;
          session_complete = parsed.session_complete || false;
        } catch {
          questions = [];
          agent_message = introMessage;
        }
      } else {
        questions = [];
        agent_message = introMessage;
      }
    }

    // If no questions returned, mark session complete
    if (questions.length === 0) session_complete = true;

    // Log completion
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "clarifier", action: "generate_questions", status: "completed",
      message: session_complete
        ? `Session complete. ${totalQuestionsAsked} questions asked total.`
        : `Generated ${questions.length} clarification questions.`,
      metadata: { question_count: questions.length, round: conversation_history.length > 0 ? "follow_up" : "initial", session_complete },
    });

    return new Response(
      JSON.stringify({ success: true, questions, agent_message, intro_message: introMessage, session_complete }),
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
