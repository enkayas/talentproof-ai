import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/cv/$submissionId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const url = process.env.SUPABASE_URL!;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(url, anon);
        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData?.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = userData.user.id;

        const { data: sub, error: subErr } = await supabaseAdmin
          .from("submissions")
          .select("id, candidate_name, cv_file_path, job_id")
          .eq("id", params.submissionId)
          .maybeSingle();
        if (subErr || !sub || !sub.cv_file_path) {
          return new Response("Not found", { status: 404 });
        }

        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("owner_id")
          .eq("id", sub.job_id)
          .maybeSingle();
        if (!job || job.owner_id !== userId) {
          return new Response("Forbidden", { status: 403 });
        }

        const { data: file, error: dlErr } = await supabaseAdmin.storage
          .from("cv-resumes")
          .download(sub.cv_file_path);
        if (dlErr || !file) {
          return new Response("Not found", { status: 404 });
        }

        const buf = await file.arrayBuffer();
        const safeName = (sub.candidate_name || "cv")
          .replace(/[^a-z0-9-_ ]/gi, "_")
          .slice(0, 80);
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${safeName}.pdf"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
