import {
  articleCategories,
  articles,
  filterArticles,
} from "@/entities/editorial"
import Footer from "@/widgets/footer"
import { Link, useSearchParams } from "react-router"

export default function Blogs() {
  const [params, setParams] = useSearchParams()
  const query = params.get("q") || ""
  const category = params.get("category") || ""
  const results = filterArticles(query, category)
  const featured = articles[0]
  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  return (
    <>
      <main>
        <section className="sn-block bg-[#101010] text-white">
          <div className="sn-container grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mb-4 text-sm text-white">The Prahit journal</p>
              <h1 className="sn-display">
                Small steps.
                <br />
                <span className="sn-white-underline">New possibilities.</span>
              </h1>
              <h2 className="mt-7 text-xl font-medium">{featured.title}</h2>
              <p className="mt-4 max-w-lg leading-7 text-white/85">
                {featured.excerpt}
              </p>
              <Link
                className="sn-btn sn-btn-primary mt-7"
                to={`/blogs/${featured.slug}`}
              >
                Read the guide →
              </Link>
              <p className="mt-7 text-sm text-white/85">
                Ready to put an idea into practice?{" "}
                <Link
                  to="/services"
                  className="text-white underline underline-offset-4"
                >
                  Explore courses
                </Link>
              </p>
            </div>
            <img
              src={featured.image}
              alt={featured.imageAlt}
              width="960"
              height="600"
              className="w-full rounded-xl"
            />
          </div>
        </section>
        <section className="sn-block">
          <div className="sn-container">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="sn-eyebrow">Ideas for your next step</p>
                <h2 className="sn-heading">Explore the journal</h2>
              </div>
              <div className="w-full sm:w-80">
                <label
                  htmlFor="article-search"
                  className="mb-2 block text-sm font-medium"
                >
                  Search articles
                </label>
                <input
                  id="article-search"
                  type="search"
                  className="form-style w-full"
                  placeholder="Search learning guides"
                  value={query}
                  onChange={(event) => update("q", event.target.value)}
                />
              </div>
            </div>
            <div
              className="mt-8 flex flex-wrap gap-3"
              role="group"
              aria-label="Article categories"
            >
              {["", ...articleCategories].map((topic) => (
                <button
                  type="button"
                  key={topic}
                  aria-pressed={category === topic}
                  className={`sn-btn ${category === topic ? "sn-btn-primary" : "sn-btn-secondary"}`}
                  onClick={() => update("category", topic)}
                >
                  {topic || "All articles"}
                </button>
              ))}
            </div>
            <p className="mt-6 text-sm text-text-secondary" role="status">
              {results.length} article{results.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4 divide-y divide-border-default">
              {results.map((article) => (
                <article
                  key={article.slug}
                  className="grid items-center gap-7 py-9 md:grid-cols-[0.8fr_1.2fr]"
                >
                  <Link
                    to={`/blogs/${article.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <img
                      src={article.image}
                      alt=""
                      width="960"
                      height="600"
                      loading="lazy"
                      className="w-full rounded-xl"
                    />
                  </Link>
                  <div>
                    <p className="text-sm font-medium text-brand-primary">
                      {article.category}{" "}
                      <span className="mx-2 text-text-secondary">·</span>{" "}
                      {article.readingTime}
                    </p>
                    <h3 className="mt-4 text-2xl leading-snug font-semibold">
                      <Link to={`/blogs/${article.slug}`}>{article.title}</Link>
                    </h3>
                    <p className="mt-4 leading-7 text-text-secondary">
                      {article.excerpt}
                    </p>
                    <Link
                      className="mt-5 inline-flex min-h-11 items-center font-medium text-brand-primary"
                      to={`/blogs/${article.slug}`}
                    >
                      Read article →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {!results.length && (
              <div className="sn-card mt-6 text-center">
                <h3 className="text-lg font-semibold">
                  No articles match your search
                </h3>
                <p className="mt-3 text-text-secondary">
                  Try another topic or view all of our guides.
                </p>
                <button
                  type="button"
                  className="sn-btn sn-btn-secondary mt-5"
                  onClick={() => setParams({})}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
