const Privacy = () => {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="#/" className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white">
          ← Back to home
        </a>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
          This policy explains how Continuum collects, uses, and protects your information.
        </p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              We collect the data you provide when you create your account and use the product. This includes notes,
              entities, and metadata needed to power your experience.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. How We Use Data</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Your data is used to deliver the app, maintain your workspace, and make the product function reliably.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">3. Security</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              We implement reasonable safeguards to protect your content. However, no system is completely immune
              to unauthorized access.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">4. Updates</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              This privacy policy may be updated as the product evolves. Continued use of Continuum means you accept
              any future updates.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
