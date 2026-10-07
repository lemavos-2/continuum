import { PageBackButton } from "@/components/PageBackButton";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <PageBackButton />

        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{t("lp_privacy_title")}</h1>
        <p className="mt-4 text-sm text-zinc-400">{t("lp_privacy_last_updated")}</p>

        <section className="mt-12 space-y-10 text-muted-foreground">
          <div>
            <h2 className="text-2xl font-semibold">{t("lp_privacy_section_1_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_privacy_section_1_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_privacy_section_2_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_privacy_section_2_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_privacy_section_3_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_privacy_section_3_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_privacy_section_4_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_privacy_section_4_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_privacy_section_5_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_privacy_section_5_body")}</p>
          </div>
        </section>

        <p className="mt-16 text-sm text-zinc-500">
          {t("lp_privacy_contact")}{" "}
          <a href="mailto:contact@continuum.onl" className="underline underline-offset-4 transition hover:text-foreground">
            contact@continuum.onl
          </a>
        </p>
      </div>
    </div>
  );
};

export default Privacy;
