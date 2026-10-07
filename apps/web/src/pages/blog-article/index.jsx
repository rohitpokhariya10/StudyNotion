import { articleCategories, articles } from "@/entities/editorial"
import SafeMarkdown from "@/shared/ui/SafeMarkdown"
import Footer from "@/widgets/footer"
import { Link, useNavigate, useParams } from "react-router"

export default function BlogArticle() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const article = articles.find((item) => item.slug === slug)
  if (!article)
    return (
      <>
        <main className="sn-container sn-block">
          <div className="sn-card mx-auto max-w-2xl text-center">
            <p className="sn-eyebrow">404 · Article not found</p>
            <h1 className="sn-heading">Let’s find your next good read.</h1>
            <p className="mt-4 text-text-secondary">
              This article is unavailable. Explore the Prahit journal for more
              learning guides.
            </p>
            <Link to="/blogs" className="sn-btn sn-btn-primary mt-6">
              Back to articles
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  return (
    <>
      <main className="sn-container sn-block">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-2 text-sm text-text-secondary">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/blogs">Blogs</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{article.title}</li>
          </ol>
        </nav>
        <div className="mt-8 grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <article>
            <p className="sn-eyebrow">{article.category}</p>
            <h1 className="sn-display">{article.title}</h1>
            <p className="mt-5 text-sm text-text-secondary">
              Prahit guide · {article.readingTime}
            </p>
            <img
              src={article.image}
              alt={article.imageAlt}
              width="960"
              height="600"
              className="my-8 w-full rounded-xl"
            />
            <div className="sn-prose">
              <SafeMarkdown>{article.body}</SafeMarkdown>
            </div>
            <Link to="/blogs" className="sn-btn sn-btn-secondary mt-8">
              ← All articles
            </Link>
          </article>
          <aside
            className="space-y-7 lg:sticky lg:top-8"
            aria-label="More from the journal"
          >
            <form
              role="search"
              className="sn-card"
              onSubmit={(event) => {
                event.preventDefault()
                const q = new FormData(event.currentTarget).get("q")
                navigate(`/blogs?${new URLSearchParams({ q })}`)
              }}
            >
              <label htmlFor="related-search" className="block font-semibold">
                Find another guide
              </label>
              <input
                type="search"
                id="related-search"
                name="q"
                className="form-style mt-4 w-full"
                placeholder="Search articles"
              />
              <button
                type="submit"
                className="sn-btn sn-btn-primary mt-3 w-full"
              >
                Search articles
              </button>
            </form>
            <div className="sn-card">
              <h2 className="text-lg font-semibold">Explore topics</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {articleCategories.map((category) => (
                  <Link
                    key={category}
                    to={`/blogs?${new URLSearchParams({ category })}`}
                    className="sn-btn sn-btn-secondary"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
            <div className="sn-card">
              <h2 className="text-lg font-semibold">Keep reading</h2>
              <ul className="mt-3 divide-y divide-border-default">
                {articles
                  .filter((item) => item.slug !== slug)
                  .map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={`/blogs/${item.slug}`}
                        className="block py-4 leading-6 font-medium hover:text-brand-primary"
                      >
                        {item.title}
                        <span className="mt-2 block text-xs font-normal text-text-secondary">
                          {item.readingTime}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="sn-card sn-card-tint">
              <h2 className="text-lg font-semibold">
                A question about Prahit?
              </h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Get help with your account, courses or purchases.
              </p>
              <Link to="/contact" className="sn-btn sn-btn-primary mt-5">
                Contact us
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  )
}
