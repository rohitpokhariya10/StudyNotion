export default function Tab({ tabData, field, setField }) {
  return (
    <div
      style={{
        boxShadow: "inset 0px -1px 0px rgba(255, 255, 255, 0.18)",
      }}
      className="my-6 flex max-w-max gap-x-1 rounded-full bg-richblack-800 p-1"
      aria-label="Account type"
      role="group"
    >
      {tabData.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setField(tab.type)}
          aria-pressed={field === tab.type}
          className={`${
            field === tab.type
              ? "bg-richblack-900 text-richblack-5"
              : "bg-transparent text-richblack-200"
          } rounded-full px-5 py-2 transition-all duration-200`}
        >
          {tab?.tabName}
        </button>
      ))}
    </div>
  )
}
