const Terms = () => {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="#/" className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white">
          ← Back to home
        </a>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
          These terms govern your use of Continuum. By using the service, you agree to these conditions.
        </p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="text-2xl font-semibold">1. Acceptance</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              When you access or use Continuum, you accept and agree to be bound by these terms. If you do not agree,
              do not use the service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. Use of the Service</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Continuum is provided for personal and business productivity. You may not use the platform for unlawful
              activities or to violate the rights of others.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">3. Content</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              All content you create belongs to you. Continuum may store and process that content in order to deliver
              functionality and improve the experience.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">4. Changes</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Terms may be updated from time to time. Continued use of Continuum after changes means you accept the
              revised terms.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Terms;
