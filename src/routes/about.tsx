import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Users, Award } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "درباره ما | استودیو فریم‌ای‌آی" },
      { name: "description", content: "استودیو فریم‌ای‌آی، تیم تخصصی روایت سینمایی رویدادها و برندها." },
      { property: "og:title", content: "درباره استودیو فریم‌ای‌آی" },
      { property: "og:description", content: "تیم ما، ماموریت ما، و نگاه هنری ما." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="container-page py-16">
      <header className="max-w-3xl">
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">درباره ما</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold leading-tight">
          روایت‌گر لحظه‌های <span className="text-gradient-gold">واقعی</span> شما.
        </h1>
        <p className="mt-6 text-lg leading-9 text-muted-foreground">
          استودیو فریم‌ای‌آی جمعی از فیلم‌سازان، کارگردان‌ها و طراحان صداست که با نگاهی سینمایی، لحظه‌های ماندگار زندگی و برندهای شما را ثبت می‌کنند. ما به روایت باور داریم — و باور داریم هر پروژه، فیلم‌نامه‌ای منحصر به فرد است.
        </p>
      </header>

      <section className="mt-14 grid gap-6 md:grid-cols-3">
        {[
          { icon: Camera, num: "۵۰+", label: "پروژه اجرا شده" },
          { icon: Users, num: "۱۰", label: "عضو تیم حرفه‌ای" },
          { icon: Award, num: "۷", label: "سال تجربه سینمایی" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-8 text-center">
            <s.icon className="mx-auto text-[color:var(--gold)]" size={28} />
            <p className="mt-4 text-3xl font-bold text-gradient-gold">{s.num}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">ماموریت ما</h2>
          <div className="gold-divider mt-3 max-w-[80px]" />
          <p className="mt-4 leading-9 text-muted-foreground">
            ما لحظه‌های واقعی را با نگاه سینمایی روایت می‌کنیم؛ بی هیاهو، با تمرکز بر جزئیات و احساسات. هدف ما تولید آثاری است که سال‌ها بعد هم تازگی و تأثیرگذاری خود را حفظ کنند.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold">نگاه هنری ما</h2>
          <div className="gold-divider mt-3 max-w-[80px]" />
          <p className="mt-4 leading-9 text-muted-foreground">
            سینمایی به معنای شلوغی نیست. ما به آرامش قاب، عمق نور و ریتم روایت اهمیت می‌دهیم. هر پروژه با فیلم‌نامه، استوری‌بورد و پالت رنگی اختصاصی طراحی می‌شود.
          </p>
        </div>
      </section>

      <section className="mt-20 rounded-3xl border border-[color:var(--gold)]/30 bg-gradient-to-br from-[color:var(--charcoal)] to-[#1c1a12] p-10 md:p-14 text-center">
        <h2 className="text-3xl font-bold">همکاری با ما را آغاز کنید</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto leading-8">
          چه یک شب خاص در پیش دارید، چه برند شما به نگاه سینمایی نیاز دارد — ما در کنار شما هستیم.
        </p>
        <Link to="/contact" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          ثبت درخواست
        </Link>
      </section>
    </div>
  );
}
