import { Newspaper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  "React 19 + Vite",
  "Tailwind CSS v4",
  "shadcn/ui-style primitives",
  "Netlify SPA redirects",
];

export default function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(83,109,254,0.15),transparent_32%),linear-gradient(180deg,#0b1020_0%,#11182d_45%,#f7f8fc_45%,#f7f8fc_100%)] text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl rounded-[2rem] border border-white/40 bg-white/75 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
            <Sparkles className="size-4 text-blue-600" />
            Netlify-ready starter
          </div>
          <div className="mt-8 flex items-start gap-4">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <Newspaper className="size-8" />
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-balance text-slate-950 md:text-6xl">
                Newsreader is ready for product work, not just scaffolding.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                This repo is bootstrapped with Vite, React, Tailwind, and a
                shadcn-compatible component setup, with Netlify deployment
                defaults already in place.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg">Start building</Button>
            <Button size="lg" variant="outline">
              Add your first route
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
