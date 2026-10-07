const Stats = [
  { count: "5K", label: "Active Students" },
  { count: "10+", label: "Mentors" },
  { count: "200+", label: "Courses" },
  { count: "50+", label: "Awards" },
]

const StatsComponenet = () => {
  return (
    <div className="bg-surface-elevated">
      {/* Stats */}
      <div className="mx-auto flex w-11/12 max-w-maxContent flex-col justify-between gap-10 text-text-primary">
        <div className="grid grid-cols-2 text-center md:grid-cols-4">
          {Stats.map((data, index) => {
            return (
              <div className="flex flex-col py-10" key={index}>
                <h1 className="text-[30px] font-bold text-text-primary">
                  {data.count}
                </h1>
                <h2 className="text-[16px] font-semibold text-text-secondary">
                  {data.label}
                </h2>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default StatsComponenet
