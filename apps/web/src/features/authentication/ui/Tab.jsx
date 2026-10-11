export default function Tab({ tabData, field, setField }) {
  return (
    <div className="sn-auth-segment" aria-label="Account type" role="group">
      {tabData.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setField(tab.type)}
          aria-pressed={field === tab.type}
        >
          {tab?.tabName}
        </button>
      ))}
    </div>
  )
}
