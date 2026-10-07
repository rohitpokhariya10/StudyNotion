import {
  neetClient,
  NeetMockCard,
  NeetMockCardSkeleton,
  NeetResourceStatus,
  useNeetResource,
} from "@/entities/neet"
import ProductCollage from "@/shared/ui/ProductCollage"
import { ProjectNeetShell } from "@/widgets/neet-shell"
import { useSelector } from "react-redux"
import { Link } from "react-router"

export default function NeetMocks() {
  const authenticated = useSelector((s) => s.auth.isAuthenticated)
  const student = useSelector((s) => s.profile.user?.accountType === "Student")
  const catalog = useNeetResource(neetClient.listTests, [])
  const history = useNeetResource(
    (options) =>
      authenticated && student
        ? neetClient.listAttempts(options)
        : Promise.resolve({ attempts: [] }),
    [authenticated, student]
  )
  return (
    <ProjectNeetShell>
      <div className="mx-auto w-full max-w-[1200px] px-5 py-12">
        <header className="mb-8 grid items-center gap-6 rounded-[2rem] bg-neet-canvas-raised p-6 sm:grid-cols-[1fr_220px] sm:p-8">
          <div>
            <p className="text-sm font-bold tracking-widest text-neet-accent uppercase">
              Your next sitting
            </p>
            <h1 className="pn-display mt-3 text-5xl font-bold">Mock tests</h1>
            <p className="mt-5 max-w-2xl leading-7 text-neet-muted">
              Choose a paper, check your details and find your focus. Your timer
              starts only when you press Start test.
            </p>
          </div>
          <ProductCollage variant="science" className="hidden sm:block" />
        </header>
        <NeetResourceStatus
          resource={catalog}
          loading={
            <div
              role="status"
              aria-label="Loading mock tests"
              className="grid gap-5 md:grid-cols-2"
            >
              <NeetMockCardSkeleton />
              <NeetMockCardSkeleton />
            </div>
          }
        />
        {catalog.data?.tests.length === 0 && (
          <p className="pn-card p-6">
            No mocks are available yet. Please check back soon.
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          {catalog.data?.tests.map((test) => (
            <NeetMockCard key={test.id} test={test} />
          ))}
        </div>
        {authenticated && student && (
          <section className="mt-12">
            <h2 className="mb-5 text-2xl font-bold">Your recent attempts</h2>
            <NeetResourceStatus resource={history} />
            <ul className="space-y-3">
              {history.data?.attempts.map((attempt) => {
                const hasResult = ["SUBMITTED", "AUTO_SUBMITTED"].includes(
                  attempt.status
                )
                const open = ["REGISTERED", "READY", "IN_PROGRESS"].includes(
                  attempt.status
                )
                const path = hasResult
                  ? `/project-neet/attempts/${attempt.id}/result`
                  : attempt.status === "IN_PROGRESS"
                    ? `/project-neet/attempts/${attempt.id}`
                    : `/project-neet/mocks/${attempt.testId}/start`
                return (
                  <li
                    key={attempt.id}
                    className="pn-card flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div>
                      <p className="font-bold">
                        {attempt.testTitle} · Attempt {attempt.attemptNumber}
                      </p>
                      <p className="mt-1 text-sm text-neet-muted">
                        {attempt.status.replaceAll("_", " ")}
                        {hasResult
                          ? ` · ${attempt.score} / ${attempt.maxScore}`
                          : ""}
                      </p>
                    </div>
                    {(hasResult || open) && (
                      <Link className="pn-btn pn-btn-secondary" to={path}>
                        {hasResult ? "View result" : "Continue attempt"}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
            {history.data?.attempts.length === 0 && (
              <p className="text-neet-muted">
                Your first attempt starts with a mock above.
              </p>
            )}
          </section>
        )}
      </div>
    </ProjectNeetShell>
  )
}
